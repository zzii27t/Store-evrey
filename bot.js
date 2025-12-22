const { Telegraf, Markup } = require('telegraf');
const supabase = require('./supabase');
require('dotenv').config();

// التحقق من التوكن
if (!process.env.BOT_TOKEN) {
  console.error('❌ ERROR: BOT_TOKEN is missing in .env file!');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const FOUNDER_ID = parseInt(process.env.FOUNDER_ID) || 0;

// ==========================================
// 🛍️ إعدادات المنتجات والأسعار (بالنجوم Stars)
// ==========================================
// يمكنك تعديل الأسعار (price) حسب رغبتك هنا
const PRODUCTS = {
  fivem: {
    id: 'fivem',
    name: '🎮 حساب FIVEM',
    description: 'حساب FiveM كامل وجاهز للاستخدام',
    price: 150 // السعر بالنجوم
  },
  gemini: {
    id: 'gemini',
    name: '💎 اشتراك جيمناي سنوي',
    description: 'اشتراك Gemini Advanced لمدة سنة كاملة',
    price: 500 // السعر بالنجوم
  },
  youtube: {
    id: 'youtube',
    name: '📺 يوتيوب بريميوم',
    description: 'اشتراك YouTube Premium بدون إعلانات',
    price: 100 // السعر بالنجوم
  }
};

const PAYMENT_CURRENCY = 'XTR'; // عملة التيليجرام

// تخزين مؤقت لطلبات الإيميل
const pendingEmailEntries = new Map();
// تخزين معلومات المستخدم للإشعارات
const userInfoCache = new Map();

// Middleware لتسجيل النشاط
bot.use(async (ctx, next) => {
  const username = ctx.from?.username || ctx.from?.first_name || 'unknown';
  console.log(`📩 نشاط جديد من: ${username} (${ctx.updateType})`);
  await next();
});

// ==========================================
// 🏠 رسالة الترحيب /start
// ==========================================
bot.start(async (ctx) => {
  const welcomeMessage = `
👋 **أهلاً بك في مجمع ستور!**

نقدم لك أفضل الخدمات الرقمية بأسعار منافسة وتسليم سريع.
اختر ما يناسبك من القائمة أدناه 👇
    `.trim();

  await ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('🛍️ عرض المنتجات', 'show_products')]
    ]).reply_markup
  });
});

// ==========================================
// 🛒 قائمة المنتجات
// ==========================================
bot.action('show_products', async (ctx) => {
  await ctx.answerCbQuery();
  
  // إنشاء أزرار لكل المنتجات الموجودة في القائمة
  const productButtons = Object.values(PRODUCTS).map(product => {
    return [Markup.button.callback(`${product.name} - ${product.price} ⭐️`, `buy_${product.id}`)];
  });

  // إضافة زر رجوع
  productButtons.push([Markup.button.callback('🔙 رجوع للقائمة الرئيسية', 'back_to_main')]);

  await ctx.editMessageText(
    '📦 **المنتجات المتاحة في مجمع ستور:**\n\nاختر المنتج الذي ترغب بشرائه:',
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard(productButtons).reply_markup
    }
  );
});

// زر الرجوع
bot.action('back_to_main', async (ctx) => {
  await ctx.answerCbQuery();
  const welcomeMessage = `👋 **أهلاً بك في مجمع ستور!**\n\nاضغط بالأسفل لعرض خدماتنا.`;
  await ctx.editMessageText(welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('🛍️ عرض المنتجات', 'show_products')]
    ]).reply_markup
  });
});

// ==========================================
// 💳 إنشاء الفاتورة (عند اختيار منتج)
// ==========================================
bot.action(/^buy_(.+)$/, async (ctx) => {
  const productId = ctx.match[1];
  const product = PRODUCTS[productId];

  if (!product) {
    return ctx.answerCbQuery('❌ المنتج غير موجود');
  }

  await ctx.answerCbQuery();

  const invoice = {
    title: product.name,
    description: product.description,
    payload: `${productId}_${ctx.from.id}_${Date.now()}`, // نضع اسم المنتج في البايلود
    provider_token: '', // فارغ لنجوم تيليجرام
    currency: 'XTR',
    prices: [{ label: product.name, amount: product.price }]
  };

  await ctx.replyWithInvoice(invoice);
});

// ==========================================
// ✅ تأكيد الدفع المسبق (Pre-checkout)
// ==========================================
bot.on('pre_checkout_query', async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

// ==========================================
// 💰 معالجة الدفع الناجح
// ==========================================
bot.on('successful_payment', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name;
  const payment = ctx.message.successful_payment;
  const payloadParts = payment.invoice_payload.split('_');
  const productId = payloadParts[0]; // استخراج معرف المنتج من البايلود
  
  // حفظ معلومات المستخدم مؤقتاً
  userInfoCache.set(userId, {
    first_name: ctx.from.first_name,
    username: username,
    lastProduct: PRODUCTS[productId]?.name || 'منتج غير معروف' // حفظ اسم المنتج المشتراة
  });

  // الحفظ في قاعدة البيانات
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      username: username,
      status: 'pending',
      payment_amount: payment.total_amount,
      payment_currency: payment.currency, // يمكننا تخزين اسم المنتج هنا لاحقاً إذا أردنا تعديل الجدول
      email: `Product: ${productId}` // تخزين مؤقت لاسم المنتج حتى يكتب الإيميل
    })
    .select()
    .single();

  if (!error) {
    pendingEmailEntries.set(userId, data.id);
    await ctx.reply(
      `✅ **تم الدفع بنجاح لشراء: ${PRODUCTS[productId]?.name}**\n\n` +
      '📧 يرجى إرسال **الإيميل** الخاص بك الآن (أو أي ملاحظة) لإتمام الطلب.',
      { parse_mode: 'Markdown' }
    );
  }
});

// ==========================================
// 📧 استقبال الإيميل وإشعار الأدمن
// ==========================================
bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;

  const userId = ctx.from.id;
  
  if (pendingEmailEntries.has(userId)) {
    const orderId = pendingEmailEntries.get(userId);
    const email = ctx.message.text;
    const userInfo = userInfoCache.get(userId);
    const productName = userInfo?.lastProduct || 'منتج رقمي';

    // تحديث الإيميل في قاعدة البيانات
    await supabase
      .from('subscriptions')
      .update({ email: email }) // تحديث حقل الإيميل بالقيمة الحقيقية
      .eq('id', orderId);

    pendingEmailEntries.delete(userId);

    // إرسال إشعار للمؤسس
    const adminMsg = `
🔔 **طلب جديد في مجمع ستور!**

📦 **المنتج:** ${productName}
👤 **المشتري:** @${userInfo?.username} (ID: ${userId})
📧 **البيانات المرسلة:** ${email}
💰 **المبلغ:** مدفوع ✅

👇 هل توافق على الطلب؟
    `.trim();

    await bot.telegram.sendMessage(FOUNDER_ID, adminMsg, {
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ تم التسليم', `approve_${userId}`),
          Markup.button.callback('❌ رفض', `reject_${userId}`)
        ]
      ]).reply_markup
    });

    await ctx.reply('✅ تم استلام بياناتك! سيتم مراجعة طلبك وتسليمك المنتج قريباً.');
  }
});

// ==========================================
// 👨‍💼 لوحة تحكم الأدمن (موافقة/رفض)
// ==========================================
bot.action(/^(approve|reject)_(\d+)$/, async (ctx) => {
  const action = ctx.match[1];
  const targetUserId = ctx.match[2]; // هنا نستخدم ID المستخدم لإرسال الرسالة له

  if (ctx.from.id !== FOUNDER_ID) return;

  if (action === 'approve') {
    await bot.telegram.sendMessage(targetUserId, '✅ **مبروك!** تم تنفيذ طلبك وتسليم المنتج بنجاح. شكراً لثقتك بمجمع ستور.');
    await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n✅ **تم التسليم**');
  } else {
    await bot.telegram.sendMessage(targetUserId, '❌ عذراً، تم رفض الطلب أو إلغاؤه. يرجى التواصل مع الدعم.');
    await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n❌ **تم الرفض**');
  }
  
  await ctx.answerCbQuery();
});

// تشغيل البوت
bot.launch();
console.log('🚀 Mojamma Store Bot is running...');

// إيقاف آمن
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

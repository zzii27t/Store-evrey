const { Telegraf, Markup } = require('telegraf');
const supabase = require('./supabase');
require('dotenv').config();

// Validate BOT_TOKEN
if (!process.env.BOT_TOKEN) {
  console.error('❌ ERROR: BOT_TOKEN is missing in .env file!');
  console.error('Please create a .env file and add your BOT_TOKEN from @BotFather');
  process.exit(1);
}

console.log('🤖 تهيئة البوت...');

let bot;
try {
  bot = new Telegraf(process.env.BOT_TOKEN);
  console.log('✅ تم تهيئة البوت بنجاح');
} catch (error) {
  console.error('❌ خطأ في تهيئة البوت:', error.message);
  console.error('تفاصيل الخطأ:', error);
  process.exit(1);
}

const FOUNDER_ID = parseInt(process.env.FOUNDER_ID) || 0;
const PAYMENT_AMOUNT = parseInt(process.env.PAYMENT_AMOUNT || '1');
// Telegram Stars currency is always 'XTR'
const PAYMENT_CURRENCY = 'XTR';

console.log(`💰 مبلغ الدفع: ${PAYMENT_AMOUNT} ${PAYMENT_CURRENCY}`);
if (FOUNDER_ID) {
  console.log(`👤 Founder ID: ${FOUNDER_ID}`);
} else {
  console.log('⚠️  Founder ID غير مضبوط (الإشعارات لن تعمل)');
}

// Store pending email entries (user_id -> waiting for email)
const pendingEmailEntries = new Map();

// Middleware to log all updates
bot.use(async (ctx, next) => {
  try {
    const updateType = ctx.updateType;
    const userId = ctx.from?.id || 'unknown';
    const username = ctx.from?.username || ctx.from?.first_name || 'unknown';
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📨 استلام تحديث: ${updateType}`);
    console.log(`👤 من: ${username} (ID: ${userId})`);
    
    if (ctx.message?.text) {
      console.log(`📝 النص: ${ctx.message.text}`);
    }
    
    if (ctx.callbackQuery) {
      console.log(`🔘 Callback: ${ctx.callbackQuery.data}`);
    }
    
    console.log(`${'='.repeat(50)}`);
    
    await next();
    
    console.log(`✅ تم معالجة التحديث: ${updateType}`);
  } catch (error) {
    console.error('\n❌ خطأ في middleware:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
});

// Handle /start command
bot.start(async (ctx) => {
  const userId = ctx.from.id;

  try {
    console.log(`📥 Received /start from user ${userId}`);
    
    // Welcome message with button
    const welcomeMessage = `
🎉 مرحباً بك في بوت اشتراكات ChatGPT!

✨ احصل على اشتراك ChatGPT الآن بسهولة وسرعة

📦 الباقة المتاحة:
• اشتراك ChatGPT
• سعر واحد: ${PAYMENT_AMOUNT} ⭐

👇 اضغط على الزر أدناه للحصول على الباقة
    `.trim();

    await ctx.reply(welcomeMessage, {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🛒 الحصول على الباقات', 'get_subscription')]
      ]).reply_markup
    });
    console.log('✅ Welcome message sent');

  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ خطأ في معالجة /start');
    console.error('='.repeat(50));
    console.error('الرسالة:', error.message);
    console.error('الكود:', error.code || 'غير محدد');
    console.error('المستخدم:', userId);
    console.error('تفاصيل الخطأ الكاملة:');
    console.error(error);
    console.error('='.repeat(50) + '\n');
    
    try {
      await ctx.reply('❌ حدث خطأ. الرجاء المحاولة لاحقاً.\n\n' + error.message);
    } catch (replyError) {
      console.error('❌ فشل في إرسال رسالة الخطأ:', replyError.message);
    }
  }
});

// Store user info for founder notifications
const userInfoCache = new Map();

// Handle successful payment
bot.on('successful_payment', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name || 'غير معروف';
  const payment = ctx.message.successful_payment;

  try {
    console.log('\n' + '='.repeat(50));
    console.log('💳💳💳 تم استلام دفع ناجح! 💳💳💳');
    console.log('='.repeat(50));
    console.log(`👤 المستخدم: ${username} (ID: ${userId})`);
    console.log(`💰 المبلغ: ${payment.total_amount} ${payment.currency}`);
    console.log(`📦 Payload: ${payment.invoice_payload}`);
    console.log('='.repeat(50) + '\n');

    // Store user info for founder notification
    userInfoCache.set(userId, {
      first_name: ctx.from.first_name || '',
      last_name: ctx.from.last_name || '',
      username: username
    });

    // Store payment info in database with pending status
    // For Telegram Stars (XTR), amount is already in stars (not cents)
    const paymentAmount = payment.currency === 'XTR' 
      ? payment.total_amount 
      : payment.total_amount / 100;

    console.log('💾 جاري حفظ البيانات في قاعدة البيانات...');
    
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        username: username,
        status: 'pending',
        payment_amount: paymentAmount,
        payment_currency: payment.currency,
        email: null // Will be filled when user provides email
      })
      .select()
      .single();

    if (error) {
      console.error('❌ خطأ في قاعدة البيانات:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return ctx.reply('❌ حدث خطأ في حفظ البيانات. الرجاء المحاولة لاحقاً.');
    }

    console.log('✅ تم حفظ البيانات بنجاح - ID:', data.id);

    // Mark user as waiting for email
    pendingEmailEntries.set(userId, data.id);
    console.log(`📧 تم تفعيل وضع انتظار الإيميل للمستخدم ${userId}`);

    // Request email from user
    await ctx.reply(
      '✅ تم استلام الدفع بنجاح!\n\n' +
      '📧 أدخل الإيميل الذي تملك عليه حساب ChatGPT لتفعيلك.\n' +
      '⚠️ نحن غير مسؤولين في حال كان الإيميل غلط',
      {
        reply_markup: Markup.removeKeyboard()
      }
    );
    
    console.log('✅ تم إرسال رسالة طلب الإيميل للمستخدم');

  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌❌❌ خطأ في معالجة الدفع ❌❌❌');
    console.error('='.repeat(50));
    console.error('الرسالة:', error.message);
    console.error('Stack:', error.stack);
    console.error('='.repeat(50) + '\n');
    
    try {
      await ctx.reply('❌ حدث خطأ في معالجة الدفع. الرجاء المحاولة لاحقاً.');
    } catch (replyError) {
      console.error('❌ فشل في إرسال رسالة الخطأ:', replyError.message);
    }
  }
});

// Handle pre-checkout query (MUST answer within 10 seconds)
// Telegram sends this before allowing payment
bot.on('pre_checkout_query', async (ctx) => {
  try {
    console.log('\n' + '='.repeat(50));
    console.log('💳💳💳 Pre-checkout query received 💳💳💳');
    console.log('='.repeat(50));
    console.log(`👤 User ID: ${ctx.from.id}`);
    console.log(`📦 Invoice payload: ${ctx.preCheckoutQuery.invoice_payload}`);
    console.log(`💰 Total amount: ${ctx.preCheckoutQuery.total_amount} ${ctx.preCheckoutQuery.currency}`);
    console.log('='.repeat(50) + '\n');
    
    // Answer the pre-checkout query to allow payment
    // Must answer within 10 seconds, otherwise payment will fail
    await ctx.answerPreCheckoutQuery(true);
    
    console.log('✅ Pre-checkout query answered successfully - Payment allowed');
    
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌❌❌ Error answering pre-checkout query ❌❌❌');
    console.error('='.repeat(50));
    console.error('الرسالة:', error.message);
    console.error('Stack:', error.stack);
    console.error('='.repeat(50) + '\n');
    
    // Answer with error to prevent payment
    try {
      await ctx.answerPreCheckoutQuery(false, {
        error_message: 'حدث خطأ في معالجة الدفع. الرجاء المحاولة لاحقاً.'
      });
      console.log('❌ Pre-checkout query answered with error - Payment blocked');
    } catch (e) {
      console.error('❌ Failed to answer pre-checkout with error:', e.message);
    }
  }
});

// Handle any text message (including commands that aren't /start)
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;

  // Skip if it's /start (already handled)
  if (text.startsWith('/start')) {
    return;
  }

  // Skip other commands
  if (text.startsWith('/')) {
    return;
  }

  // Check if user is waiting to provide email
  if (pendingEmailEntries.has(userId)) {
    const subscriptionId = pendingEmailEntries.get(userId);
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(text)) {
      return ctx.reply('❌ يرجى إدخال إيميل صحيح.');
    }

    try {
      // Update subscription with email
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          email: text,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return ctx.reply('❌ حدث خطأ في حفظ الإيميل. الرجاء المحاولة لاحقاً.');
      }

      // Remove from pending list
      pendingEmailEntries.delete(userId);

      // Notify founder
      await notifyFounder(ctx, data);

      // Confirm to user
      await ctx.reply('✅ تم استلام إيميلك. سيتم مراجعته قريباً.');

    } catch (error) {
      console.error('Error saving email:', error);
      ctx.reply('❌ حدث خطأ. الرجاء المحاولة لاحقاً.');
    }
  }
});

// Notify founder about new subscription request
async function notifyFounder(ctx, subscription) {
  try {
    const userInfo = userInfoCache.get(subscription.user_id) || {};
    const message = `
🔔 طلب اشتراك جديد

👤 معلومات المستخدم:
• المعرف: ${subscription.user_id}
• اسم المستخدم: @${subscription.username || 'غير متوفر'}
• الاسم: ${(userInfo.first_name || '') + ' ' + (userInfo.last_name || '')}

📧 الإيميل: ${subscription.email}

💰 الدفع: ${subscription.payment_amount} ${subscription.payment_currency}

🆔 رقم الطلب: #${subscription.id}
📅 التاريخ: ${new Date(subscription.created_at).toLocaleString('ar-SA')}
    `.trim();

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ تم إنهاء العملية', `approve_${subscription.id}`),
        Markup.button.callback('❌ مرفوض', `reject_${subscription.id}`)
      ]
    ]);

    await bot.telegram.sendMessage(FOUNDER_ID, message, {
      reply_markup: keyboard.reply_markup
    });

  } catch (error) {
    console.error('Error notifying founder:', error);
  }
}

// Handle "Get Subscription" button click
bot.action('get_subscription', async (ctx) => {
  const userId = ctx.from.id;

  try {
    console.log(`📥 المستخدم ${userId} ضغط على "الحصول على الباقات"`);
    
    // Answer callback query to remove loading state
    await ctx.answerCbQuery();

    // Send payment invoice
    // For Telegram Stars (XTR), the amount must be exactly 1 star = 1
    // provider_token must be empty string for Telegram Stars
    const invoice = {
      title: 'اشتراك ChatGPT',
      description: 'اشتراك ChatGPT - دفع واحد',
      payload: `subscription_${userId}_${Date.now()}`, // Unique payload with timestamp
      provider_token: '', // MUST be empty for Telegram Stars
      currency: 'XTR', // Telegram Stars currency code
      prices: [
        {
          label: 'الاشتراك',
          amount: PAYMENT_AMOUNT // Amount in stars (1 = 1 star)
        }
      ]
    };

    console.log('📤 جاري إرسال الفاتورة...');
    console.log(`💰 المبلغ: ${PAYMENT_AMOUNT} ${PAYMENT_CURRENCY}`);
    console.log(`📦 Payload: ${invoice.payload}`);
    console.log(`💱 Currency: ${invoice.currency}`);
    
    await ctx.replyWithInvoice(invoice);
    console.log('✅ تم إرسال الفاتورة بنجاح');

  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ خطأ في إظهار الفاتورة');
    console.error('='.repeat(50));
    console.error('الرسالة:', error.message);
    console.error('الكود:', error.code || 'غير محدد');
    console.error('تفاصيل الخطأ الكاملة:');
    console.error(error);
    console.error('='.repeat(50) + '\n');
    
    try {
      await ctx.answerCbQuery('❌ حدث خطأ. الرجاء المحاولة لاحقاً.', true);
    } catch (cbError) {
      console.error('❌ فشل في الرد على callback:', cbError.message);
    }
  }
});

// Handle founder's approval/rejection
bot.action(/^(approve|reject)_(\d+)$/, async (ctx) => {
  const action = ctx.match[1];
  const subscriptionId = parseInt(ctx.match[2]);
  const founderId = ctx.from.id;

  // Check if the action is from the founder
  if (founderId !== FOUNDER_ID) {
    return ctx.answerCbQuery('❌ غير مصرح لك بتنفيذ هذا الإجراء.');
  }

  try {
    // Update subscription status
    const status = action === 'approve' ? 'approved' : 'rejected';
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return ctx.answerCbQuery('❌ حدث خطأ في تحديث البيانات.');
    }

    // Send message to user
    const userId = data.user_id;
    if (action === 'approve') {
      const approvalMessage = `✅ تم إنهاء العملية بنجاح!

اذهب إلى الرسائل الواردة في إيميلك واضغط على "انضمام" من الإيميل الذي وصلك من OpenAI ليتم التفعيل.

من جهتنا تم التفعيل، الباقي عندك. بتوفيق! 🎉`;

      await bot.telegram.sendMessage(
        userId,
        approvalMessage
      );
      await ctx.answerCbQuery('✅ تم الموافقة على الطلب');
      await ctx.editMessageReplyMarkup(null); // Remove buttons
    } else {
      await bot.telegram.sendMessage(
        userId,
        '❌ تم رفض طلبك.\n\nللأسف، لم يتم قبول طلب الاشتراك الخاص بك.'
      );
      await ctx.answerCbQuery('❌ تم رفض الطلب');
      await ctx.editMessageReplyMarkup(null); // Remove buttons
    }

  } catch (error) {
    console.error('Error processing action:', error);
    ctx.answerCbQuery('❌ حدث خطأ في معالجة الطلب.');
  }
});

// Error handling - catch all errors
bot.catch((err, ctx) => {
  console.error('\n' + '='.repeat(50));
  console.error('❌❌❌ خطأ في البوت! ❌❌❌');
  console.error('='.repeat(50));
  console.error('الرسالة:', err.message);
  console.error('السياق:', ctx?.updateType || 'unknown');
  console.error('User ID:', ctx?.from?.id || 'unknown');
  console.error('تفاصيل الخطأ:', err);
  if (err.stack) {
    console.error('Stack trace:', err.stack);
  }
  console.error('='.repeat(50) + '\n');
  
  try {
    if (ctx && ctx.reply) {
      ctx.reply('❌ حدث خطأ غير متوقع. الرجاء المحاولة لاحقاً.');
    }
  } catch (replyError) {
    console.error('❌ فشل في إرسال رسالة الخطأ للمستخدم:', replyError.message);
  }
});

// Log when bot is ready (for debugging)
console.log('✅ جميع handlers تم تسجيلها بنجاح');
console.log('   - /start command');
console.log('   - successful_payment event');
console.log('   - text messages');
console.log('   - get_subscription button');
console.log('   - approve/reject actions');

module.exports = bot;


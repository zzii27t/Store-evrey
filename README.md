<div align="center">

# 🤖 Telegram Digital Products Sales Bot

### 💎 Sell Digital Products Easily and Securely via Telegram Stars

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Telegraf](https://img.shields.io/badge/Telegraf-4.16+-blue.svg)](https://telegraf.js.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.39+-purple.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Complete system for selling subscriptions and digital products at competitive prices**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Structure](#-structure)

---

</div>

## 📋 Overview

A professional Telegram bot for selling digital products (such as ChatGPT subscriptions and more) through a secure payment system using **Telegram Stars**. Provides a smooth experience for users and easy management for administrators.

### ✨ Why This Bot?

- 💰 **Competitive Prices** - Sell products at lower prices than traditional markets
- 🔒 **Secure Payment** - Using Telegram Stars integrated in Telegram
- ⚡ **Easy to Use** - Simple and fast interface
- 📊 **Complete Management** - Approval/rejection system for orders
- 🚀 **Production Ready** - Works on Render and other platforms

---

## 🌟 Features

### For Users 👥
- ✅ Simple and straightforward interface
- ✅ Secure payment via Telegram Stars
- ✅ Instant notifications about order status
- ✅ No need for external accounts

### For Administrators 👨‍💼
- ✅ Simple dashboard via Telegram
- ✅ Instant notifications for each new order
- ✅ Fast approval/rejection system
- ✅ Secure data storage in Supabase
- ✅ Complete log of orders and payments

### Technical 🔧
- ✅ Webhook and Polling support
- ✅ Advanced error handling
- ✅ Detailed logging
- ✅ Production ready

---

## 🚀 Installation

### Prerequisites

- [Node.js](https://nodejs.org/) 16 or higher
- [Telegram Bot](https://t.me/BotFather) account
- [Supabase](https://supabase.com) account
- [Render](https://render.com) account (for deployment)

---

### Step 1️⃣: Clone the Project

```bash
git clone <repository-url>
cd telegram-subscription-bot
npm install
```

---

### Step 2️⃣: Setup Environment Variables

Copy the `.env.example` file to `.env`:

```bash
cp env.example .env
```

Edit the `.env` file and add the following values:

```env
# Telegram Bot Configuration
BOT_TOKEN=your_bot_token_here
FOUNDER_ID=your_telegram_user_id_here

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# Server Configuration
PORT=3000
WEBHOOK_URL=https://your-app-name.onrender.com

# Payment Configuration
PAYMENT_AMOUNT=1
PAYMENT_CURRENCY=XTR
```

---

### Step 3️⃣: Get Bot Token

1. Go to [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the instructions
3. Save the **Token** he gives you
4. Put it in `BOT_TOKEN` in the `.env` file

---

### Step 4️⃣: Get Founder ID

1. Go to [@userinfobot](https://t.me/userinfobot) on Telegram
2. Send `/start`
3. Save the **ID** he gives you
4. Put it in `FOUNDER_ID` in the `.env` file

---

### Step 5️⃣: Setup Supabase

#### 5.1 Create Project
1. Create an account on [Supabase](https://supabase.com)
2. Create a new project
3. Wait until setup is complete

#### 5.2 Setup Database
1. Go to **SQL Editor** in Supabase
2. Open the `database.sql` file from the project
3. Copy the entire content
4. Paste it in SQL Editor
5. Click **Run** to execute the code

#### 5.3 Get API Keys
1. Go to **Settings** > **API**
2. Copy **Project URL** and put it in `SUPABASE_URL`
3. Copy **anon/public key** and put it in `SUPABASE_KEY`

---

### Step 6️⃣: Run Locally

```bash
# For normal run
npm start

# For development with auto-restart
npm run dev
```

---

## 📦 Deploy on Render

### 1. Create Render Account
- Go to [Render](https://render.com)
- Sign up for a new account (can use GitHub)

### 2. Create Web Service
1. Click **New** > **Web Service**
2. Connect GitHub repository
3. Fill in the settings:
   - **Name**: Choose a name for the project
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Plan**: Choose the appropriate plan

### 3. Add Environment Variables
In the **Environment Variables** section, add all variables from the `.env` file:
- `BOT_TOKEN`
- `FOUNDER_ID`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `PORT` (optional, default: 3000)
- `WEBHOOK_URL` (will be filled after deployment)
- `PAYMENT_AMOUNT`
- `PAYMENT_CURRENCY`

### 4. Get Webhook URL
1. After deployment, Render will give you a URL like: `https://your-app.onrender.com`
2. Copy this URL
3. Add it in Environment Variables as `WEBHOOK_URL`
4. Redeploy the project

---

## 💻 Usage

### For Users

1. **Start the Bot**
   ```
   /start
   ```

2. **Click on "🛒 Get Subscription" button**

3. **Pay via Telegram Stars**
   - A payment invoice will appear
   - Click **Pay** and pay using Stars

4. **Enter Email**
   - After successful payment, the bot will request email
   - Enter the required email

5. **Wait for Approval**
   - A notification will be sent to the administrator
   - After approval, you will receive the activation message

### For Administrators

When a new order arrives, you will receive a message containing:
- User information
- Entered email
- Payment amount
- Order number

**Available Options:**
- ✅ **Approved** - To approve the order
- ❌ **Rejected** - To reject the order

---

## 📁 Structure

```
telegram-subscription-bot/
├── 📄 index.js              # Express server and webhook handler
├── 🤖 bot.js                # Main bot logic
├── 🗄️  supabase.js           # Supabase connection
├── 📊 database.sql           # Database schema
├── 📦 package.json           # Dependencies and settings
├── 🔐 env.example            # Environment variables example
└── 📖 README.md             # This file
```

---

## 🔄 Workflow

```
User starts bot
    ↓
Clicks "Get Subscription" button
    ↓
Pays via Telegram Stars
    ↓
Enters email
    ↓
Notification sent to admin
    ↓
Admin approves/rejects
    ↓
User receives confirmation/rejection message
```

---

## 🗄️ Database

### `subscriptions` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Unique identifier (Primary Key) |
| `user_id` | BIGINT | User ID in Telegram |
| `username` | VARCHAR(255) | Username |
| `email` | VARCHAR(255) | Email (can be NULL) |
| `status` | VARCHAR(50) | Status: pending, approved, rejected |
| `payment_amount` | INTEGER | Payment amount |
| `payment_currency` | VARCHAR(10) | Payment currency (XTR) |
| `created_at` | TIMESTAMP | Creation date |
| `updated_at` | TIMESTAMP | Last update date |

---

## 🔐 Security

- ⚠️ **Don't share `.env` file** or upload it to Git
- ⚠️ **Protect your API keys**
- ⚠️ **Use HTTPS only** in production
- ⚠️ **Review orders** before approving them

---

## 🛠️ Development

### Adding New Products

To modify displayed products, edit in `bot.js`:

```javascript
const invoice = {
  title: 'Product Name',
  description: 'Product Description',
  // ...
};
```

### Modifying Payment Amount

Edit in `.env` file:
```env
PAYMENT_AMOUNT=1
```

---

## 🐛 Troubleshooting

### Bot Not Working
- ✅ Check `BOT_TOKEN` is correct
- ✅ Check internet connection
- ✅ Check bot is activated from @BotFather

### Database Not Working
- ✅ Check `SUPABASE_URL` and `SUPABASE_KEY` are correct
- ✅ Check `database.sql` is executed in Supabase
- ✅ Verify API Key permissions

### Webhook Not Working
- ✅ Check `WEBHOOK_URL` is correct
- ✅ Check server is running on Render
- ✅ Check logs in Render Dashboard

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the project
2. Create a new branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Support

For help or to report issues:
- Open an [Issue](https://github.com/your-repo/issues) in the repository
- Or contact us on Telegram

---

## ⭐ Acknowledgments

Thanks for using this bot! If you like the project, don't forget to ⭐ Star it!

---

<div align="center">

**Made with ❤️ for the Community**

[⬆ Back to Top](#-telegram-digital-products-sales-bot)

</div>

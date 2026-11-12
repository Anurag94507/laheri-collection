import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  rootDir: path.resolve(__dirname, '..'),
  port: num(process.env.PORT, 5178),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
  jwtSecret: process.env.JWT_SECRET || 'raja-menswear-dev-secret-change-me',
  shopName: process.env.SHOP_NAME || 'Laheri Collection',
  shopAddress: process.env.SHOP_ADDRESS || 'Near Dariyapur Chauraha, In Front of Vishal Mega Mart, Sultanpur - 228001',
  shopPhone: process.env.SHOP_PHONE || '+91 7800509636',
  shopEmail: process.env.SHOP_EMAIL || 'laheri.collection@gmail.com',
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'shop12345',
  },
  mongoUri: process.env.MONGODB_URI || '',
  mongoDb: process.env.MONGODB_DB || 'raja_menswear',
  chatbot: {
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.CHATBOT_MODEL || 'claude-3-5-haiku-latest',
    geminiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },
  mail: {
    host: process.env.SMTP_HOST || '',
    port: num(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Raja Menswear <no-reply@example.com>',
  },
  twilio: {
    sid: process.env.TWILIO_ACCOUNT_SID || '',
    token: process.env.TWILIO_AUTH_TOKEN || '',
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || '',
    smsFrom: process.env.TWILIO_SMS_FROM || '',
  },
  msg91: {
    authKey: process.env.MSG91_AUTH_KEY || '',
    senderId: process.env.MSG91_SENDER_ID || '',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
};

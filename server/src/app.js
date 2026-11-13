import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { errorHandler, notFound } from './middleware/error.js';
import accountRoutes from './routes/account.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import billRoutes from './routes/bills.js';
import bulkRoutes from './routes/bulk.js';
import chatbotRoutes from './routes/chatbot.js';
import categoryRoutes from './routes/categories.js';
import couponRoutes from './routes/coupons.js';
import customerRoutes from './routes/customers.js';
import gameRoutes from './routes/games.js';
import orderRoutes from './routes/orders.js';
import productRoutes from './routes/products.js';
import settingsRoutes from './routes/settings.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const allowedOrigins = config.clientOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (!config.isProduction && /^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
      return callback(null, false);
    },
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'raja-menswear', time: new Date().toISOString() });
});

const chatbotLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'You are chatting a little too fast. Please wait a minute and try again.' },
});

app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/chatbot', chatbotLimiter, chatbotRoutes);
app.use('/api/admin', adminRoutes);

// Serve the built React app when it exists (single-service deployment).
const clientDist = path.resolve(config.rootDir, '..', 'client', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;

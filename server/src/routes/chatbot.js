import { Router } from 'express';
import { getDb } from '../db/index.js';
import { asyncHandler } from '../middleware/error.js';
import { upsertCustomer } from '../services/crm.js';
import { generateReply } from '../services/chatbot.js';
import { newId } from '../utils/ids.js';
import { normalizeMobile } from '../utils/validate.js';

const router = Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const messages = Array.isArray(req.body?.messages) ? req.body.messages.slice(-20) : [];
    if (!messages.length) return res.status(400).json({ error: 'Send at least one message.' });
    const sessionId = String(req.body?.sessionId || newId()).slice(0, 64);

    const sanitized = messages
      .filter((message) => message && typeof message.content === 'string')
      .map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content.slice(0, 2000),
      }));

    const { reply, source, suggestions } = await generateReply(db, sanitized);
    const lastUserMessage = [...sanitized].reverse().find((message) => message.role === 'user');

    await db.collection('chatLogs').insertOne({
      _id: newId(),
      sessionId,
      source,
      preview: String(lastUserMessage?.content || '').slice(0, 140),
      replyPreview: String(reply).slice(0, 140),
      createdAt: new Date().toISOString(),
    });

    // If the visitor shares a mobile number, quietly capture the lead for the CRM.
    const mobileMatch = String(lastUserMessage?.content || '').match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);
    if (mobileMatch) {
      const mobile = normalizeMobile(mobileMatch[1]);
      await upsertCustomer(db, {
        mobile,
        source: 'chatbot',
        tags: ['Chatbot Lead'],
        countOrder: false,
        note: 'Shared contact in website chat',
      });
    }

    res.json({ reply, source, suggestions: suggestions || [] });
  })
);

export default router;

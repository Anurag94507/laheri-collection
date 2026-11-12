import { config } from '../config.js';
import { getSettings, publicSettings } from './settings.js';

export function buildSystemPrompt(settings) {
  const shop = settings.shop;
  const offers = settings.offers;
  const hours = (shop.hours || []).map((slot) => `${slot.days}: ${slot.time}`).join('; ');
  return `You are "Raja", the friendly AI assistant for ${shop.name}, a trusted men's readymade clothing store located at ${shop.address}, ${shop.city}.

SHOP DETAILS:
- Shop Name: ${shop.name}
- Owner: ${shop.owner}
- Address: ${shop.address}, ${shop.city}, ${shop.state} ${shop.pincode}
- Phone: ${shop.phone}
- WhatsApp: ${shop.whatsapp}
- Email: ${shop.email}
- Working Hours: ${hours}
- Google Maps: ${shop.mapsLink}
- Instagram: ${settings.social.instagram}
- Facebook: ${settings.social.facebook}

WHAT YOU SELL:
- Kurtas (casual, festive, printed, plain)
- Sherwanis (wedding, sangeet, festive)
- Formal Shirts & Trousers
- Casual T-Shirts & Jeans
- Traditional Dhotis & Paijamas
- Occasion wear sets

CURRENT OFFERS:
- ${offers.active ? `${offers.title}: ${offers.subtitle} (code ${offers.code})` : 'No festival offer is running right now. Ask about in-store discounts.'}
- Extra notes from the owner: ${settings.chatbot?.extraNotes || 'None'}

YOUR PERSONALITY:
- Friendly, warm and helpful like a trusted shop assistant.
- Speak in simple Hindi-English (Hinglish) when the user writes in Hindi.
- Be enthusiastic about the shop and its products.
- NEVER invent prices. Say "Please check our website's product page for latest prices" or "Call us at ${shop.phone}".
- Help with product queries, store hours, location, ordering help, return policy, fabric advice and occasion suggestions.
- Suggest categories based on the occasion the user mentions.
- For complaints: apologise and direct them to ${shop.phone} on WhatsApp.
- End each conversation warmly: "Dhanyawad! Hamari shop mein aapka swagat hai 🙏"

RETURN POLICY:
- Exchange within 7 days with bill.
- No returns on sale items.
- Free alteration within 3 days of purchase.

WHAT YOU CANNOT DO:
- Take orders (direct them to the website cart).
- Share exact stock counts.
- Promise delivery dates.

Always be concise, helpful, and make the customer feel like they are talking to a knowledgeable shop staff member.`;
}

function contextForLocal(settings, products) {
  const categories = [...new Set(products.map((product) => product.category))];
  return { settings, categories };
}

function localReply(text, { settings, categories }) {
  const shop = settings.shop;
  const raw = String(text || '').toLowerCase();
  const has = (...words) => words.some((word) => raw.includes(word));
  const warmEnd = ' Dhanyawad! Hamari shop mein aapka swagat hai 🙏';

  if (has('hour', 'timing', 'time', 'open', 'close', 'band', 'khul')) {
    const hours = (shop.hours || []).map((slot) => `${slot.days} — ${slot.time}`).join(' • ');
    return `${shop.name} is open ${hours}. Walk in any time — no appointment needed.${warmEnd}`;
  }

  if (has('where', 'address', 'location', 'kaha', 'map', 'direction', 'reach')) {
    return `We are at ${shop.address}, ${shop.city} — ${shop.pincode}. Landmark: near Clock Tower. Directions: ${shop.mapsLink}. Call ${shop.phone} if you need help finding us.${warmEnd}`;
  }

  if (has('offer', 'discount', 'sale', 'coupon', 'deal', 'chhoot')) {
    if (settings.offers.active) {
      return `Right now: ${settings.offers.title} — ${settings.offers.subtitle} Use code ${settings.offers.code} at checkout. You can also spin the wheel on our website for an extra one-time coupon of up to 30% off.${warmEnd}`;
    }
    return `No festival offer is live today, but our sale rack and game coupons are always running. Check the Offers page or call ${shop.phone}.${warmEnd}`;
  }

  if (has('return', 'exchange', 'refund', 'alter', 'badal')) {
    return `Exchange is accepted within 7 days with the bill. Sale items cannot be returned. Alterations are free within 3 days of purchase and take about 2–3 days in-house.${warmEnd}`;
  }

  if (has('wedding', 'shaadi', 'sangeet', 'reception', 'engagement')) {
    return `For weddings I would suggest our Sherwani collection — ivory, maroon and indigo options with gold detailing — paired with a festive kurta set. Browse /collections?category=Sherwani or visit the shop for a trial fitting. Our tailor does free alterations.${warmEnd}`;
  }

  if (has('sherwani')) return `Yes, we stock wedding and festive sherwanis in ivory, maroon and indigo, with sizes S to XXL. See live prices on our Sherwani collection page — call ${shop.phone} for fabric close-ups.${warmEnd}`;
  if (has('kurta')) return `Our kurtas start from everyday cotton to festive silk blends, in printed and plain styles, S–XXL. Check the Kurta collection for latest prices. festive range is a favourite for Diwali and Eid.${warmEnd}`;
  if (has('shirt', 'formal', 'office')) return `For office wear we have cotton and linen-blend formal shirts in blues, whites and checks, plus trousers to match. Linen is our summer recommendation for Lucknow heat.${warmEnd}`;
  if (has('dhoti', 'paijama', 'pajama', 'traditional')) return `Yes — traditional dhotis and paijama sets in cotton and silk blends, with matching stoles. Sizes available in store; call ${shop.phone} to reserve one.${warmEnd}`;
  if (has('size', 'fit', 'xxl', 'measurement')) return `We stock S, M, L, XL and XXL across most categories, and our tailor can adjust the fit. Alterations for purchases are free within 3 days.${warmEnd}`;
  if (has('order', 'delivery', 'ship', 'track', 'online')) return `To order: add items to the cart, choose your size, then enter your name and mobile number at checkout — no account needed. Order updates go on WhatsApp, and you can track any order on the Track Order page. Delivery is 2–4 working days; store pickup is ready in 2 hours.${warmEnd}`;
  if (has('cod', 'cash', 'payment', 'upi', 'card', 'pay')) return `We accept UPI, debit/credit cards and cash. Online orders support prepaid UPI/card and Cash on Delivery. Offline bills can be paid in store by cash, UPI or card.${warmEnd}`;
  if (has('contact', 'call', 'whatsapp', 'phone', 'number', 'email')) return `Call or WhatsApp us on ${shop.phone}, or email ${shop.email}. We reply on WhatsApp fastest during shop hours.${warmEnd}`;
  if (has('hi', 'hello', 'hey', 'namaste', 'namaskar', 'good morning', 'good evening')) return `Namaste! Welcome to ${shop.name}. I can help with collections, prices, offers, store timings and ordering. What are you shopping for today — a wedding, office wear, or something festive?`;
  if (has('complain', 'complaint', 'issue', 'wrong', 'damaged', 'problem')) return `I am really sorry about that. Please call or WhatsApp ${shop.phone} with your bill number so the owner can fix it right away.${warmEnd}`;

  return `I can help with collections (${categories.join(', ')}), offers, store timings, delivery and alterations. For anything specific, call us on ${shop.phone}. What occasion are you shopping for?${warmEnd}`;
}

async function callAnthropic(messages, system) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.chatbot.anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.chatbot.anthropicModel,
      max_tokens: 500,
      system,
      messages: messages.slice(-12).map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: String(message.content || '').slice(0, 2000),
      })),
    }),
  });
  if (!response.ok) throw new Error(`Anthropic API ${response.status}`);
  const data = await response.json();
  return data.content?.map((part) => part.text || '').join('').trim() || null;
}

async function callGemini(messages, system) {
  const model = config.chatbot.geminiModel;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.chatbot.geminiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.slice(-12).map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(message.content || '').slice(0, 2000) }],
        })),
        generationConfig: { maxOutputTokens: 500, temperature: 0.6 },
      }),
    }
  );
  if (!response.ok) throw new Error(`Gemini API ${response.status}`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || null;
}

export async function generateReply(db, messages) {
  const settings = await getSettings(db);
  const products = await db.collection('products').find({}).limit(200).toArray();
  const system = buildSystemPrompt(settings);
  const safeMessages = Array.isArray(messages) ? messages : [];
  const lastMessage = safeMessages[safeMessages.length - 1]?.content || '';

  if (config.chatbot.anthropicKey) {
    try {
      const reply = await callAnthropic(safeMessages, system);
      if (reply) return { reply, source: 'anthropic' };
    } catch (error) {
      console.error('[chatbot] anthropic failed:', error.message);
    }
  }

  if (config.chatbot.geminiKey) {
    try {
      const reply = await callGemini(safeMessages, system);
      if (reply) return { reply, source: 'gemini' };
    } catch (error) {
      console.error('[chatbot] gemini failed:', error.message);
    }
  }

  return {
    reply: localReply(lastMessage, contextForLocal(settings, products)),
    source: 'local',
    suggestions: ['Opening hours', 'New arrivals', 'Wedding sherwanis', 'Spin the Wheel'],
  };
}

export { publicSettings };

import assert from 'node:assert/strict';
import { deliveryStatus, sendCode } from '../worker/notify.js';

const calls = [];
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), init });
  const body = globalThis.__nextBody ?? { type: 'success' };
  return new Response(JSON.stringify(body), { status: globalThis.__nextStatus ?? 200 });
};
const last = () => calls[calls.length - 1];

// nothing configured
assert.equal(deliveryStatus({}).configured, false);
await assert.rejects(() => sendCode({}, { channel: 'whatsapp', identifier: '9876500001', code: '123456' }), /No sign-in code sender/);

// MSG91 SMS
const msg91 = { MSG91_AUTH_KEY: 'key123', MSG91_TEMPLATE_ID: 'tpl1' };
assert.equal(deliveryStatus(msg91).configured, true);
let result = await sendCode(msg91, { channel: 'sms', identifier: '9876500001', code: '654321' });
assert.equal(result.provider, 'msg91-sms');
assert.match(last().url, /^https:\/\/control\.msg91\.com\/api\/v5\/otp\?/);
assert.match(last().url, /mobile=919876500001/);
assert.match(last().url, /otp=654321/);
assert.equal(last().init.headers.authkey, 'key123');

// MSG91 answers 200 with type:error -> must throw
globalThis.__nextBody = { type: 'error', code: '201', message: 'Invalid authkey' };
await assert.rejects(() => sendCode(msg91, { channel: 'sms', identifier: '9876500001', code: '654321' }), /MSG91 refused/);
globalThis.__nextBody = null;

// Twilio WhatsApp
const twilio = { TWILIO_ACCOUNT_SID: 'AC123', TWILIO_AUTH_TOKEN: 'tok', TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886' };
result = await sendCode(twilio, { channel: 'whatsapp', identifier: '9876500002', code: '111222' });
assert.equal(result.provider, 'twilio-whatsapp');
assert.match(last().url, /Accounts\/AC123\/Messages\.json/);
assert.match(last().init.body, /To=whatsapp%3A%2B919876500002/);
assert.match(last().init.body, /From=whatsapp%3A%2B14155238886/);
assert.match(last().init.headers.Authorization, /^Basic /);

// Twilio SMS fallback + email
result = await sendCode({ ...twilio, TWILIO_FROM: '+12025550123' }, { channel: 'sms', identifier: '9876500003', code: '333444' });
assert.equal(result.provider, 'twilio-sms');
assert.match(last().init.body, /From=%2B12025550123/);

const mail = { RESEND_API_KEY: 're_x', MAIL_FROM: 'shop@laheri.test' };
result = await sendCode(mail, { channel: 'email', identifier: 'asha@example.com', code: '555666' });
assert.equal(result.provider, 'resend-email');
assert.deepEqual(JSON.parse(last().init.body).to, ['asha@example.com']);

// email asked for but only SMS configured
await assert.rejects(() => sendCode(msg91, { channel: 'email', identifier: 'a@b.com', code: '1' }), /No email sender/);

// provider failure surfaces
globalThis.__nextStatus = 500;
await assert.rejects(() => sendCode(msg91, { channel: 'sms', identifier: '9876500001', code: '1' }), /MSG91 refused/);

console.log('notify.js: all delivery checks passed');

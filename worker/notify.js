/**
 * Sign-in code delivery for the Laheri Collection Worker.
 *
 * Add any one of these to the deployed Worker's secrets and codes go straight to the
 * customer; with none configured the shop relays codes from the admin console instead.
 *
 *   MSG91_AUTH_KEY + MSG91_TEMPLATE_ID          SMS to Indian mobile numbers
 *   TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN
 *     + TWILIO_FROM                             SMS (fallback when MSG91 is absent)
 *     + TWILIO_WHATSAPP_FROM                    WhatsApp, when the customer picks it
 *   RESEND_API_KEY + MAIL_FROM                  Email codes
 */
const TIMEOUT_MS = 8000;
const value = (env, key) => String(env[key] || '').trim();

export function deliveryStatus(env) {
  const msg91 = Boolean(value(env, 'MSG91_AUTH_KEY') && value(env, 'MSG91_TEMPLATE_ID'));
  const twilioSms = Boolean(
    value(env, 'TWILIO_ACCOUNT_SID') && value(env, 'TWILIO_AUTH_TOKEN') && value(env, 'TWILIO_FROM')
  );
  const twilioWhatsapp = Boolean(
    value(env, 'TWILIO_ACCOUNT_SID') && value(env, 'TWILIO_AUTH_TOKEN') && value(env, 'TWILIO_WHATSAPP_FROM')
  );
  const email = Boolean(value(env, 'RESEND_API_KEY') && value(env, 'MAIL_FROM'));
  return {
    configured: msg91 || twilioSms || twilioWhatsapp || email,
    msg91,
    sms: msg91 || twilioSms,
    whatsapp: twilioWhatsapp,
    email,
  };
}

async function post(url, init) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const raw = await response.text();
  let body = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }
  return { ok: response.ok, status: response.status, body };
}

async function sendMsg91(env, mobile, code) {
  const authkey = value(env, 'MSG91_AUTH_KEY');
  const params = new URLSearchParams({
    authkey,
    template_id: value(env, 'MSG91_TEMPLATE_ID'),
    mobile: `91${mobile}`,
    otp: code,
    otp_length: '6',
    otp_expiry: '5',
  });
  const result = await post(`https://control.msg91.com/api/v5/otp?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', authkey },
    body: '{}',
  });
  // MSG91 answers 200 even when it refuses the send, so the body decides.
  if (!result.ok || result.body?.type === 'error') {
    const detail = result.body?.code ? ` code ${result.body.code}` : '';
    throw new Error(`MSG91 refused the code (${result.status}${detail})`);
  }
  return 'msg91-sms';
}

async function sendTwilio(env, mobile, from, code, whatsapp) {
  const sid = value(env, 'TWILIO_ACCOUNT_SID');
  const token = value(env, 'TWILIO_AUTH_TOKEN');
  const sender = from.replace(/^whatsapp:/, '');
  const body = new URLSearchParams({
    To: whatsapp ? `whatsapp:+91${mobile}` : `+91${mobile}`,
    From: whatsapp ? `whatsapp:${sender}` : sender,
    Body: `Your Laheri Collection sign-in code is ${code}. It expires in 5 minutes.`,
  });
  const result = await post(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }
  );
  if (!result.ok) throw new Error(`Twilio refused the message (${result.status}${result.body?.code ? ` code ${result.body.code}` : ''})`);
  return whatsapp ? 'twilio-whatsapp' : 'twilio-sms';
}

async function sendResend(env, email, code) {
  const result = await post('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${value(env, 'RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: value(env, 'MAIL_FROM'),
      to: [email],
      subject: 'Your Laheri Collection sign-in code',
      html: `<p>Your Laheri Collection sign-in code is <strong style="font-size:20px;letter-spacing:3px">${code}</strong>.</p><p>It expires in 5 minutes. If you did not ask for it, ignore this email.</p>`,
    }),
  });
  if (!result.ok) throw new Error(`Email provider refused the message (${result.status})`);
  return 'resend-email';
}

/** Sends a sign-in code to a mobile number (SMS/WhatsApp) or an email address. */
export async function sendCode(env, { channel, identifier, code }) {
  const status = deliveryStatus(env);
  if (!status.configured) throw new Error('No sign-in code sender is configured.');

  if (identifier.includes('@')) {
    if (!status.email) throw new Error('No email sender is configured.');
    return { provider: await sendResend(env, identifier, code), channel: 'email' };
  }
  if (channel === 'whatsapp' && status.whatsapp) {
    return { provider: await sendTwilio(env, identifier, value(env, 'TWILIO_WHATSAPP_FROM'), code, true), channel: 'whatsapp' };
  }
  if (status.msg91) {
    return { provider: await sendMsg91(env, identifier, code), channel: 'sms' };
  }
  if (status.sms) {
    return { provider: await sendTwilio(env, identifier, value(env, 'TWILIO_FROM'), code, false), channel: 'sms' };
  }
  throw new Error('No SMS sender is configured for mobile numbers.');
}

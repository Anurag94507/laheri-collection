import { config } from '../config.js';
import { normalizeMobile } from '../utils/validate.js';

let transporter = null;

export function waLink(number, message = '') {
  const digits = normalizeMobile(number);
  return `https://wa.me/91${digits}?text=${encodeURIComponent(message)}`;
}

async function sendViaTwilioWhatsApp(to, message) {
  const { sid, token, whatsappFrom } = config.twilio;
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const body = new URLSearchParams({
    To: `whatsapp:+91${normalizeMobile(to)}`,
    From: whatsappFrom || 'whatsapp:+14155238886',
    Body: message,
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`Twilio WhatsApp failed (${response.status})`);
  return response.json();
}

export async function sendWhatsApp({ to, message }) {
  if (!normalizeMobile(to)) return { channel: 'whatsapp', status: 'failed', error: 'Missing mobile number' };
  if (config.twilio.sid && config.twilio.token) {
    try {
      await sendViaTwilioWhatsApp(to, message);
      return { channel: 'whatsapp', status: 'sent' };
    } catch (error) {
      return { channel: 'whatsapp', status: 'failed', error: error.message, link: waLink(to, message) };
    }
  }
  return { channel: 'whatsapp', status: 'simulated', link: waLink(to, message) };
}

async function getTransporter() {
  if (transporter) return transporter;
  const nodemailer = await import('nodemailer');
  transporter = nodemailer.default.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465,
    auth: { user: config.mail.user, pass: config.mail.pass },
  });
  return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
  if (!to) return { channel: 'email', status: 'failed', error: 'Missing email address' };
  if (!config.mail.host || !config.mail.user) return { channel: 'email', status: 'simulated' };
  try {
    const mailer = await getTransporter();
    await mailer.sendMail({ from: config.mail.from, to, subject, text, html: html || `<p>${text}</p>` });
    return { channel: 'email', status: 'sent' };
  } catch (error) {
    return { channel: 'email', status: 'failed', error: error.message };
  }
}

export async function sendSms({ to, message }) {
  if (!normalizeMobile(to)) return { channel: 'sms', status: 'failed', error: 'Missing mobile number' };

  if (config.twilio.sid && config.twilio.token && config.twilio.smsFrom) {
    try {
      const auth = Buffer.from(`${config.twilio.sid}:${config.twilio.token}`).toString('base64');
      const body = new URLSearchParams({ To: `+91${normalizeMobile(to)}`, From: config.twilio.smsFrom, Body: message });
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${config.twilio.sid}/Messages.json`,
        { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body }
      );
      if (!response.ok) throw new Error(`Twilio SMS failed (${response.status})`);
      return { channel: 'sms', status: 'sent' };
    } catch (error) {
      return { channel: 'sms', status: 'failed', error: error.message };
    }
  }

  if (config.msg91.authKey) {
    try {
      const response = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: { authkey: config.msg91.authKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: config.msg91.senderId,
          short_url: '0',
          mobiles: `91${normalizeMobile(to)}`,
          message,
        }),
      });
      if (!response.ok) throw new Error(`MSG91 failed (${response.status})`);
      return { channel: 'sms', status: 'sent' };
    } catch (error) {
      return { channel: 'sms', status: 'failed', error: error.message };
    }
  }

  return { channel: 'sms', status: 'simulated' };
}

export async function notifyCustomer({ customer, message, subject, channels = ['whatsapp'] }) {
  const results = [];
  for (const channel of channels) {
    if (channel === 'whatsapp') results.push(await sendWhatsApp({ to: customer.mobile, message }));
    if (channel === 'sms') results.push(await sendSms({ to: customer.mobile, message }));
    if (channel === 'email' && customer.email) {
      results.push(await sendEmail({ to: customer.email, subject: subject || 'Update from our shop', text: message }));
    }
  }
  return results;
}

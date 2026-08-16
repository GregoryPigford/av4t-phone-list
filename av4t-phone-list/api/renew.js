import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { getExpiryDays } from './_expiry.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || 'noreply@av4t.com';
const SITE = 'https://av4t.com';

async function sendRenewalConfirmEmail(name, email, days) {
  if (!email) return;
  await resend.emails.send({
    from: `AV4T Phone List <${FROM}>`, to: email,
    subject: 'Your AV4T listing has been renewed',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem">
      <h2 style="color:#1a2d4a">You're renewed, ${name}!</h2>
      <p style="color:#475569;line-height:1.7">Your AV4T phone list listing has been renewed for another <strong>${days} days</strong>. We're glad you're staying with us.</p>
      <a href="${SITE}" style="display:inline-block;background:#c96a20;color:white;text-decoration:none;padding:9px 20px;border-radius:999px;font-weight:700;font-size:.88rem">Go to av4t.com</a>
      <p style="color:#94a3b8;font-size:.78rem;margin-top:1.5rem">— A Vision For Today</p>
    </div>`
  });
}

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).send(errorPage('Missing renewal token.'));
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const [id, secret] = decoded.split(':');
    if (secret !== process.env.CRON_SECRET) return res.status(401).send(errorPage('Invalid renewal link.'));
    const { data: member, error } = await supabase.from('members').select('id, name, email').eq('id', id).single();
    if (error || !member) return res.status(404).send(errorPage('Member not found.'));
    const days = await getExpiryDays();
    await supabase.from('members').update({ last_renewed: new Date().toISOString(), expiry_warned: false, active: true }).eq('id', id);
    try { await sendRenewalConfirmEmail(member.name, member.email, days); } catch(e) {}
    return res.status(200).send(successPage(member.name, days));
  } catch(e) { return res.status(400).send(errorPage('Invalid renewal link.')); }
}

function successPage(name, days) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Renewed!</title></head>
  <body style="font-family:sans-serif;background:#1a2d4a;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem">
    <div style="background:white;border-radius:1.25rem;padding:2.5rem;max-width:400px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.3)">
      <div style="font-size:3rem;margin-bottom:1rem">✅</div>
      <h2 style="font-family:Georgia,serif;color:#1a2d4a;margin-bottom:.5rem">You're renewed, ${name}!</h2>
      <p style="color:#475569;line-height:1.7;margin-bottom:1.5rem">Your listing has been renewed for another ${days} days. A confirmation email is on its way.</p>
      <a href="${SITE}" style="display:inline-block;background:#c96a20;color:white;text-decoration:none;padding:10px 24px;border-radius:999px;font-weight:700">Go to av4t.com</a>
    </div>
  </body></html>`;
}

function errorPage(msg) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Error</title></head>
  <body style="font-family:sans-serif;background:#1a2d4a;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem">
    <div style="background:white;border-radius:1.25rem;padding:2.5rem;max-width:400px;text-align:center">
      <div style="font-size:3rem;margin-bottom:1rem">⚠️</div>
      <h2 style="color:#7f1d1d;margin-bottom:.5rem">Something went wrong</h2>
      <p style="color:#475569">${msg}</p>
      <p style="color:#94a3b8;font-size:.82rem;margin-top:1rem">Contact <a href="mailto:av4today@gmail.com" style="color:#c96a20">av4today@gmail.com</a></p>
    </div>
  </body></html>`;
}

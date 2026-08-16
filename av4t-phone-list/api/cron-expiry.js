import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || 'noreply@av4t.com';
const BASE_URL = 'https://av4t.com';

export default async function handler(req, res) {
  const auth = req.headers.authorization;
  const validCron = auth === `Bearer ${process.env.CRON_SECRET}`;
  const validAdmin = auth === `Bearer ${process.env.ADMIN_PASSWORD}`;
  if (!validCron && !validAdmin) return res.status(401).json({ error: 'Unauthorized' });

  // Read expiry setting (defaults to 90 to match the seeded settings value)
  let expiryDays = 90;
  try {
    const { data: settings } = await supabase.from('settings').select('value').eq('key','expiry_days').single();
    if (settings?.value) expiryDays = parseInt(settings.value) || 90;
  } catch(e) {}
  const warnDays = expiryDays - 30;
  const warnWindow = expiryDays - warnDays; // days of notice given in the warning email

  const now = new Date();
  const dayWarn = new Date(now - warnDays * 24 * 60 * 60 * 1000);
  const dayExpiry = new Date(now - expiryDays * 24 * 60 * 60 * 1000);

  const { data: members, error } = await supabase.from('members')
    .select('id, name, email, last_renewed, expiry_warned').eq('active', true);
  if (error) return res.status(500).json({ error: error.message });

  const warned = [], expired = [], noEmail = [];

  for (const m of members) {
    const renewed = new Date(m.last_renewed);
    const token = Buffer.from(`${m.id}:${process.env.CRON_SECRET}`).toString('base64url');
    const renewUrl = `${BASE_URL}/api/renew?token=${token}`;

    if (renewed < dayExpiry) {
      await supabase.from('members').update({ active: false }).eq('id', m.id);
      expired.push(m.name);
      if (m.email) {
        try {
          await resend.emails.send({
            from: `AV4T Phone List <${FROM}>`, to: m.email,
            subject: 'Your AV4T listing has expired',
            html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem">
              <h2 style="color:#1a2d4a">Hi ${m.name},</h2>
              <p style="color:#475569;line-height:1.7">Your AV4T phone list listing has been automatically removed after ${expiryDays} days.</p>
              <p style="color:#475569;line-height:1.7;margin-bottom:1.25rem">Click below to renew and stay on the list.</p>
              <a href="${renewUrl}" style="display:inline-block;background:#c96a20;color:white;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:700;font-size:1rem;margin-bottom:1.5rem">Renew My Listing</a>
              <p style="color:#94a3b8;font-size:.82rem">— A Vision For Today</p>
            </div>`
          });
        } catch(e) {}
      }
      continue;
    }

    if (renewed < dayWarn && !m.expiry_warned) {
      if (m.email) {
        try {
          await resend.emails.send({
            from: `AV4T Phone List <${FROM}>`, to: m.email,
            subject: `Your AV4T listing expires in ${warnWindow} days`,
            html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem">
              <h2 style="color:#1a2d4a">Hi ${m.name},</h2>
              <p style="color:#475569;line-height:1.7">Your AV4T listing will expire in <strong>${warnWindow} days</strong>. Click below to stay on the list.</p>
              <a href="${renewUrl}" style="display:inline-block;background:#c96a20;color:white;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:700;font-size:1rem;margin-bottom:1.5rem">Renew My Listing</a>
              <p style="color:#94a3b8;font-size:.82rem">If you no longer wish to be on the list, ignore this email.<br>— A Vision For Today</p>
            </div>`
          });
          await supabase.from('members').update({ expiry_warned: true }).eq('id', m.id);
          warned.push(m.name);
        } catch(e) { console.error('Warn email failed:', m.name, e.message); }
      } else {
        await supabase.from('members').update({ expiry_warned: true }).eq('id', m.id);
        noEmail.push(m.name);
      }
    }
  }

  return res.status(200).json({ success: true, warned: warned.length, expired: expired.length, noEmail: noEmail.length, details: { warned, expired, noEmail } });
}

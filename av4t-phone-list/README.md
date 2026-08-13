# A Vision For Today (AV4T) — Phone List Site

A complete clone of the TUF phone-list app, rebranded for **A Vision For Today**
(Mon–Fri 9:30–10:30 AM, in person at Free Recovery Community, 2122 S Lafayette St,
Denver, CO 80210). Same architecture: single-file HTML PWA + Vercel serverless API +
Supabase + Resend email.

## Where each file goes in GitHub
Create a new repo (suggested name: `av4t-phone-list`) and upload:

- **`public/` folder** → `index.html` (the live app), `admin.html`, `list.html`,
  `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`, `New_Logo_transparent.png`
- **`api/` folder** → all 11 `.js` serverless functions
- **repo root** → `vercel.json`, `package.json`, `supabase-setup.sql`,
  `icon-192.png`, `icon-512.png`

## Setup checklist (when you're ready to deploy)
1. **Buy the domain.** I used the placeholder `av4t.com` throughout. If you
   pick a different name, find/replace `av4t.com` in the `api/` files.
2. **Supabase:** create a new project → run `supabase-setup.sql` in the SQL editor →
   create a Storage bucket named **`av4t-photos`**.
3. **Resend:** verify your domain so `noreply@av4t.com` can send.
4. **Vercel env vars** (Project → Settings → Environment Variables):
   `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY`, `FROM_EMAIL`,
   `ADMIN_PASSWORD`, `CRON_SECRET`.
5. **Import members** via the admin panel once it's live.

## Placeholders to update (flagged so they're easy to find)
- **Domain:** `av4t.com` (used in email links + sender address)
- **Contact / Zelle email:** `avisionfortoday@gmail.com`
- **Venmo donation handle:** `@AV4T-DONATIONS` (or remove the donate button)

## Config reference
- PIN salt: `av4t2025salt`  (must stay identical in `member.js` and `submit.js`)
- Storage bucket: `av4t-photos`
- Cron: daily expiry check at 10:00 (in `vercel.json`); admin "Run Check Now" uses the admin password

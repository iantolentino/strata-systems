# Strata Systems

Uptime dashboard for Strata Staff Global. It is a Vite + React app with a Vercel serverless status checker.

## Local setup

```bash
npm install
npm run dev
```

The dashboard reads `/api/check-status`. On Vercel Hobby, `vercel.json` runs that endpoint once daily. Status checks and history are stored in Supabase; the endpoint uses a short in-memory response cache so page loads do not re-ping every endpoint.

## Supabase setup

1. Create a free Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor.
3. Add these Vercel environment variables:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service-role key is server-only and must not be exposed to browser code. Without these variables, local development uses an in-memory fallback for testing. After a successful month-end emailed report, detailed rows for that completed month are summarized in `monthly_summaries` and pruned from `checks`.

## Deploy

See the full [Vercel deployment guide](VERCEL_DEPLOYMENT.md). The default Vite build settings work automatically: `npm run build`, output directory `dist`.

## Add or remove a site

Edit the array in [`src/sites.js`](src/sites.js). Each entry is `[id, display name, URL]`; no component changes are needed. The favicon is loaded from Google's favicon service at runtime.

Maintenance updates and adding sites use the intentionally simple password `123456` as requested. It is not real authentication. Added sites are stored in Supabase when the environment variables are configured.

## Monthly reports

Choose a report month near the status banner and select **Export report**. The PDF is generated in light, print-friendly styling and downloads as `strata-systems-report-YYYY-MM.pdf`. Uptime and incident totals come from the Supabase `checks` history.

## Uptime badge

Share an SVG badge for the current month with `/api/badge?site=strata-home`. Omit `site` for the overall badge. The report/email job uses `RESEND_API_KEY` and sends only to `ian@stratastaff.com`.

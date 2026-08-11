# Deploy Strata Systems to Vercel

## 1. Prepare Supabase

1. Create a free project at [supabase.com](https://supabase.com/).
2. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
3. In **Project Settings → API**, copy:
   - Project URL
   - `service_role` secret key

Keep the service-role key private. It is only used by Vercel serverless functions.

## 2. Import the GitHub repository

1. Sign in to [Vercel](https://vercel.com/).
2. Click **Add New → Project**.
3. Import `iantolentino/strata-systems`.
4. Keep the detected Vite settings:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`

## 3. Add environment variables

Before deploying, add these variables under **Settings → Environment Variables** for Production, Preview, and Development:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_your-api-key
RESEND_FROM=Strata Systems <reports@your-verified-domain.com>
```

Redeploy after adding or changing environment variables.

`RESEND_API_KEY` and `RESEND_FROM` are optional. When configured, the daily 09:00 UTC cron sends the monthly report on the last day of each month to `ian@stratastaff.com`.

## 4. Deploy

Click **Deploy**. Vercel will build the React app and deploy the functions in `api/`.

The cron configuration in [`vercel.json`](vercel.json) runs `/api/check-status` once per day at 00:00 UTC, which is compatible with Vercel Hobby. More frequent checks require Vercel Pro or an external scheduler that calls the endpoint.

## 5. Verify the deployment

After deployment:

1. Open the production URL.
2. Confirm the dashboard loads in light mode.
3. Click the theme toggle and confirm dark mode still works.
4. Use **Add site** with password `123456`.
5. Toggle maintenance on a site with password `123456`.
6. Open **Export report**, select a month, and verify the PDF downloads.
7. In Supabase, confirm rows are appearing in `checks` after a cron run.

## Local testing

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The local Vite bridge supports the API routes. Without Supabase environment variables, local status/history data uses the in-memory fallback and is not durable.

## Common fixes

- **404 on `/api/check-status`:** restart `npm run dev`; the local Vite API bridge is loaded from `vite.config.js`.
- **Supabase 500 errors:** confirm both environment variables are present and that `supabase/schema.sql` ran successfully.
- **No history in reports:** wait for a cron run or open the dashboard once after deployment to create the first checks.
- **Favicon missing:** the dashboard first uses Google's favicon service and then falls back to the site's `/favicon.ico`.

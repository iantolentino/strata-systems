# SYSTEM ARCHITECTURE

> Written during SYSTEM_GENERATION. Updated only when architecture decisions change.

---

## Architecture Pattern
Serverless monolith: single-page Vite + React 19 app, Vercel serverless functions under `/api`, Supabase (Postgres/REST) persistence.

## Layer Map
| Layer      | Technology | Responsibility                                    |
|------------|------------|---------------------------------------------------|
| Frontend   | Vite 8 + React 19 + lucide-react | Status dashboard UI (`src/main.jsx` + `src/components/*`) |
| Frontend lib | `src/lib/format.js`, `src/lib/report-pdf.js` | Pure helpers; lazy-loaded jsPDF monthly report |
| Backend    | Vercel serverless (Node) `/api/*.js`, mirrored locally by a Vite middleware in `vite.config.js` | check-status CRUD + checks, report data, badge SVG, activity feed, report-status, Resend email |
| Database   | Supabase REST (`api/storage.js`), in-memory fallback when env vars absent | sites, checks, monthly_summaries, report_status |
| Cache      | In-memory `latestCache` in check-status (~90s), bypassed by cron/manual | Avoids re-pinging endpoints per page load |
| Auth       | Hardcoded password `123456` on POST actions (owner decision — not real auth) | Gate add/edit/delete/maintenance |

## Data Flow
Browser -> GET /api/check-status -> getSites() -> parallel HEAD checks (10s timeout, 1 retry; Private On-Premise short-circuits to 'unmonitored') -> saveChecks (unmonitored filtered out) -> payload with downSince history. Cron (daily 09:00 UTC via vercel.json) triggers same handler with x-vercel-cron header and may send/prune the monthly report.

## External Integrations
Supabase REST API, Google favicon service (with direct /favicon.ico fallback), Resend (monthly email, RESEND_API_KEY).

## Scaling Strategy
None needed for MVP. Hobby cron is daily; cache absorbs page-load bursts.

## Known Risks
- Serverless instances do not share `latestCache`; effective only within warm instance.
- Password gate is trivially bypassable by design; do not expose real admin features behind it.
- `checks` table CHECK constraint allows only online/offline — any new status must be filtered before saveChecks.

## Architecture Decisions
See: `decisions/decision_log.md`

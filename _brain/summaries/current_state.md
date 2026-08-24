# CURRENT STATE

> The AI reads this file at the start of every EXECUTION_MODE session.
> Update this file at the end of every session — before stopping.

---

## System State
EXECUTION_MODE

## Current Phase
MVP + hardening pass (2026-08-22)

## Last Completed Task
TEST-007 — Add Vitest unit tests + ESLint + GitHub Actions CI
Completed: 2026-08-22

## Next Task
None — select from backlog
Depends on: none

## Active Blockers
None

## Session Notes
2026-08-22 (builder: ox-alpha): `src/frontend-features.js` (MutationObserver DOM-patch layer) was DELETED.
Every feature it injected now lives in React:
- Manage Systems panel -> `src/components/ManagePanel.jsx` (replaces old Add-site modal; header button says "Manage Systems")
- Activity feed -> `src/components/ActivityFeed.jsx`; System health card -> `SystemHealthCard.jsx`
- Report status footer -> `ReportStatus.jsx`; Sparkline -> `components/Sparkline.jsx`
- Styled PDF export -> `src/lib/report-pdf.js` (jsPDF is dynamically imported; includes incident notes section)
- Shared helpers -> `src/lib/format.js`
Key behavior changes future sessions must NOT undo without owner approval:
- Dark mode: LIGHT is default; toggle persists to localStorage key `strata-theme`.
- Private On-Premise sites return status `'unmonitored'` from `/api/check-status` (was fake `'online'`);
  they are filtered out of `saveChecks` because the Supabase `checks.status` CHECK constraint only allows online/offline.
- Password for add/edit/delete/maintenance remains hardcoded `123456` BY OWNER DECISION (see decision log).
- package.json: exact pinned versions; vite/@vitejs/plugin-react moved to devDependencies.
Vite build verified green; main JS chunk reduced ~620KB -> ~218KB by lazy-loading jspdf.
Quality gates added: `npm run lint` (ESLint 10 flat config), `npm test` (11 Vitest unit tests over src/lib/format.js), `.github/workflows/ci.yml` runs lint+test+build on push/PR to main.
README updated to match new behavior. All owner-approved hardening tasks complete as of 2026-08-22; changes are LOCAL ONLY — not yet committed/pushed.

---

Last updated: 2026-08-22

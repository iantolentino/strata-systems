# DECISION LOG

> Record every architecture, stack, or scope decision made after CONFIRMATION_LOCK.
> This prevents the AI from re-opening settled decisions in future sessions.

---

## Format

```
[TYPE] → [Decision made]
Impact: low | medium | high
Reason: [One-line justification]
Date: [YYYY-MM-DD]
```

Types: ARCH | STACK | SCOPE | SECURITY | PERFORMANCE | UX

---

## Decisions

[ARCH] → [Example: Use a modular monolith instead of microservices for MVP]
Impact: high
Reason: Reduces operational overhead; can extract services at scale if needed
Date: [date]

---

[ARCH] + 'Delete frontend-features.js MutationObserver layer; all UI features live inside the React app (src/components/*, src/lib/*)'
Impact: high
Reason: Two competing render paths caused the broken dark-mode toggle, duplicate fetches and XSS-prone innerHTML
Date: 2026-08-22

---
[SECURITY] + 'All user-controlled strings (site names, activity events) render via JSX text nodes; innerHTML eliminated from frontend'
Impact: high
Reason: Stored XSS was possible by adding a site whose name contained script markup
Date: 2026-08-22

---
[UX] + 'Private On-Premise sites report status unmonitored instead of fake online; excluded from checks writes and uptime math'
Impact: medium
Reason: Vercel cannot reach 172.16.1.243; showing online was misleading; Supabase CHECK constraint only allows online/offline so rows are filtered before saveChecks
Date: 2026-08-22

---
[STACK] + 'Pin exact dependency versions; move vite/@vitejs/plugin-react to devDependencies'
Impact: low
Reason: latest tags made builds non-reproducible; build tools are not runtime deps
Date: 2026-08-22

---
[PERFORMANCE] + 'jsPDF loaded via dynamic import in src/lib/report-pdf.js'
Impact: medium
Reason: Main JS chunk shrank ~620KB to ~218KB gzipped-bundle split verified in vite build output
Date: 2026-08-22

---
[UX] + 'Dark mode defaults to light and persists choice in localStorage key strata-theme'
Impact: low
Reason: Owner commit 86fb65c set default light mode; old feature layer kept re-forcing dark
Date: 2026-08-22

---
[SCOPE] + 'Removed dead Yearly toggle checkbox (rendered but never read by any code)'
Impact: low
Reason: Dead UI confused reviewers; can be re-added with real behavior later
Date: 2026-08-22

---
[SECURITY] + 'Keep hardcoded password 123456 for add/edit/delete/maintenance'
Impact: low
Reason: Explicit owner decision - single trusted user, not real authentication
Date: 2026-08-22

---

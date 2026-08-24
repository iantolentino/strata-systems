# FIX LOG

> Read this file FIRST before debugging anything. It is the entire memory of every bug this
> repo has already solved. Most entries should need nothing more than this table.

---

## Format

```
| ID   | Title                        | Category  | Root Cause (1 line)          | Detail File          | Date       | Status |
|------|------------------------------|-----------|-------------------------------|-----------------------|------------|--------|
| F001 | [Short bug description]     | WEB       | [One-line cause]              | inline / F001-slug.md | YYYY-MM-DD | FIXED  |
```

Categories: `WEB` | `BACKEND` | `DB` | `AUTH` | `BUILD` | `DEPLOY` | `AUTOMATION` | `CLI` | `INFRA` | `OTHER`

Status: `FIXED` | `WORKAROUND` (not a real fix, revisit) | `SUPERSEDED` (see linked replacement)

---

## Log

| ID | Title | Category | Root Cause (1 line) | Detail File | Date | Status |
|----|-------|----------|----------------------|-------------|------|--------|
| F001 | Dark-mode toggle instantly reverted to dark | WEB | frontend-features.js MutationObserver re-added .dark class on every DOM mutation after React removed it | inline | 2026-08-22 | FIXED |
| F002 | Page loaded with duplicate /api/report fetches | WEB | Mount effect and [reportMonth] effect both called loadReport on first render | inline | 2026-08-22 | FIXED |
| F003 | Stored XSS via managed-site list and activity feed | WEB | innerHTML templates interpolated unsanitized API strings (site names, event names) | inline | 2026-08-22 | FIXED |
| F004 | Private Grafana site always showed online though unreachable from Vercel | BACKEND | check() hardcoded status online for group Private On-Premise instead of checking | inline | 2026-08-22 | FIXED |
| F005 | /api/badge returned 500 locally but worked on Vercel | BUILD | Vite dev mock response lacked setHeader() that badge.js calls for Content-Type | inline | 2026-08-22 | FIXED |

---

## Usage Rule

- Skim the table only. Open a detail file ONLY if its title matches the current problem.
- If no match exists, proceed with normal debugging, then add a new row here before stopping.
- Keep "Root Cause" to one line — that line is what future AI sessions scan for a match.

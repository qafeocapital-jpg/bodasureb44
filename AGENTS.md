# BodaSure Cloud Agent Playbook

Guidelines for multiple Cursor cloud agents working in parallel on this repository.

## Branch Discipline

- Branch pattern: `cursorcloud/<short-task-name>-7c82`
- One agent = one branch = one PR
- Push before testing; update the PR each turn
- Base branch for PRs: `main`

## Hot Zones (Avoid Two Agents Editing the Same Area)

| Area | Why |
|---|---|
| `base44/functions/sasapay*` | Payment webhooks and wallet onboarding |
| `base44/functions/idAnalyzer*` | KYC callbacks and identity decisions |
| `src/lib/onboarding.js`, `src/lib/verification.js` | Onboarding phase gates |
| `src/lib/payments.js`, `src/lib/mockPayments.js` | Payment abstraction layer |
| `src/App.jsx`, `src/lib/staffNav.js` | Global routing and portal navigation |

Before starting work, check open branches and PRs for conflicts in these paths.

## Doc Map (Read When Needed — Not Every Task)

| Task type | Read first |
|---|---|
| Any unfamiliar area | `src/ARCHITECTURE.md` |
| Payment / wallet / webhook | `src/FEATURE_CONTRACTS.md` + `src/DECISIONS.md` |
| Onboarding / KYC UI | `src/FEATURE_CONTRACTS.md` + `src/QA_CHECKLISTS.md` (sections 1–2) |
| SMS / communications | `src/QA_CHECKLISTS.md` + `src/PRODUCTION_SETUP.md` |
| New locked architectural decision | Append dated entry to top of `src/DECISIONS.md` |

## Cursor Rules (3 Files)

| File | When it loads |
|---|---|
| `.cursor/rules/bodasure-fast-track.mdc` | Always — PM communication, speed, build gate, multi-agent discipline |
| `.cursor/rules/bodasure-fintech-critical.mdc` | Wallet, payment, auth, webhook, and `base44/functions/**` paths |
| `.cursor/rules/bodasure-engineering-standards.mdc` | Any edit under `src/**` or `base44/**` |

Scan all three at task start. Do not guess data models — read the doc map entry above when the task touches that domain.

## Repository Layout

| What | Location |
|---|---|
| React frontend | `src/` |
| Entity schemas (31) | `base44/entities/*.jsonc` |
| Backend functions (40) | `base44/functions/*/entry.ts` |
| SDK client | `src/api/base44Client.js` |

## Merge Checklist

Before marking a PR ready:

- [ ] `npm run build` passes
- [ ] No secrets or `.env` contents in the diff
- [ ] `src/FEATURE_CONTRACTS.md` updated if API payloads or caller contracts changed
- [ ] Relevant `src/QA_CHECKLISTS.md` section noted in the PR description
- [ ] `src/DECISIONS.md` appended if a new locked decision was made

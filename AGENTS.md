# BodaSure Cloud Agent Playbook

Guidelines for multiple Cursor cloud agents working in parallel on this repository.

## Base44 → Render + Supabase migration

**If the task is migration-related**, read these **before anything else**:

1. [`docs/MIGRATION_STATE.md`](docs/MIGRATION_STATE.md) — current phase (single source of truth)
2. [`docs/MIGRATION_PHASES.md`](docs/MIGRATION_PHASES.md) — full 26-phase list + gate checklists
3. [`docs/MIGRATION_ARCHITECTURE.md`](docs/MIGRATION_ARCHITECTURE.md) — target stack, env vars, entity maps

**Rules:**
- Execute **only** the current phase scope. Do **not** skip phases.
- Wait for PM to say **"go to next phase"** before starting the next phase.
- Verify with **Render MCP** and **Supabase MCP** when the phase requires it.
- **Do not** touch live Base44 production or its webhook URLs until Phase 26.
- Migration cursor rule: [`.cursor/rules/bodasure-cloud-migration.mdc`](.cursor/rules/bodasure-cloud-migration.mdc)

**PM starter prompt:**

```
Read docs/MIGRATION_STATE.md and execute the current phase only.
Verify with Render and Supabase MCP when done.
Give me plain-English summary and dashboard settings to check.
Do not start the next phase until I say "go to next phase".
```

## Branch Discipline

- Branch pattern: `cursorcloud/<short-task-name>-7c82`
- One agent = one branch = one PR
- Push before testing; update the PR each turn
- Base branch for PRs: `main`
- Migration repo (from Phase 1): `BodaSureNewest`, default working branch `staging`

## Hot Zones (Avoid Two Agents Editing the Same Area)

| Area | Why |
|---|---|
| `base44/functions/sasapay*` | Payment webhooks and wallet onboarding |
| `base44/functions/idAnalyzer*` | KYC callbacks and identity decisions |
| `src/lib/onboarding.js`, `src/lib/verification.js` | Onboarding phase gates |
| `src/lib/payments.js`, `src/lib/mockPayments.js` | Payment abstraction layer |
| `src/App.jsx`, `src/lib/staffNav.js` | Global routing and portal navigation |
| `docs/MIGRATION_STATE.md` | Phase progress — one agent updates per phase |

Before starting work, check open branches and PRs for conflicts in these paths.

## Doc Map (Read When Needed — Not Every Task)

| Task type | Read first |
|---|---|
| **Migration work** | `docs/MIGRATION_STATE.md` + `docs/MIGRATION_ARCHITECTURE.md` |
| Any unfamiliar area | `src/ARCHITECTURE.md` |
| Payment / wallet / webhook | `src/FEATURE_CONTRACTS.md` + `src/DECISIONS.md` |
| Onboarding / KYC UI | `src/FEATURE_CONTRACTS.md` + `src/QA_CHECKLISTS.md` (sections 1–2) |
| SMS / communications | `src/QA_CHECKLISTS.md` + `src/PRODUCTION_SETUP.md` |
| New locked architectural decision | Append dated entry to top of `src/DECISIONS.md` |

## Cursor Rules (4 Files)

| File | When it loads |
|---|---|
| `.cursor/rules/bodasure-fast-track.mdc` | Always — PM communication, speed, build gate, multi-agent discipline |
| `.cursor/rules/bodasure-fintech-critical.mdc` | Wallet, payment, auth, webhook, and `base44/functions/**` paths |
| `.cursor/rules/bodasure-engineering-standards.mdc` | Any edit under `src/**` or `base44/**` |
| `.cursor/rules/bodasure-cloud-migration.mdc` | Migration docs, `supabase/**`, `render.yaml`, `api/**` |

Scan all four at task start. For migration tasks, read `docs/MIGRATION_STATE.md` first. Do not guess data models — read the doc map entry above when the task touches that domain.

## Repository Layout

| What | Location |
|---|---|
| React frontend | `src/` |
| Entity schemas (31) | `base44/entities/*.jsonc` |
| Backend functions (40) | `base44/functions/*/entry.ts` |
| SDK client | `src/api/base44Client.js` |
| Migration state | `docs/MIGRATION_STATE.md` |
| Target architecture | `docs/MIGRATION_ARCHITECTURE.md` |

## Merge Checklist

Before marking a PR ready:

- [ ] `npm run build` passes
- [ ] No secrets or `.env` contents in the diff
- [ ] `src/FEATURE_CONTRACTS.md` updated if API payloads or caller contracts changed
- [ ] Relevant `src/QA_CHECKLISTS.md` section noted in the PR description
- [ ] `src/DECISIONS.md` appended if a new locked decision was made
- [ ] Migration phases: `docs/MIGRATION_STATE.md` updated if a migration phase completed

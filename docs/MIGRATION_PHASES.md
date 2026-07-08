# BodaSure Migration — Phase Master List

> **26-phase, gate-controlled migration** from Base44 to Render + Supabase.
> Live Base44 stays untouched until Phase 26 cutover.
> Last updated: 2026-07-08

---

## How to use this document

1. Read [`MIGRATION_STATE.md`](MIGRATION_STATE.md) for the **current phase** (single source of truth).
2. Execute **only** the current phase scope.
3. Complete the phase **gate checklist** before marking done.
4. Wait for PM to say **"go to next phase"** before continuing.

**Agent prompt to start any migration session:**

```
Read docs/MIGRATION_STATE.md and execute the current phase only.
Verify with Render and Supabase MCP when the phase requires it.
Give me a plain-English summary and dashboard settings to check.
Do not start the next phase until I say "go to next phase".
```

---

## Track A — Foundation (Phases 0–5)

| Phase | Title | Status | Gate |
|-------|-------|--------|------|
| **0** | Migration governance | COMPLETED | Docs + cursor rule + AGENTS.md exist |
| **1** | New GitHub repo (BodaSureNewest) | PENDING | Repo exists; `staging` + `main` branches pushed |
| **2** | MCP verification (Render + Supabase) | PENDING | Both MCPs authenticated; project IDs documented |
| **3** | Supabase staging bootstrap | PENDING | `supabase/` scaffold; MCP `list_tables` OK |
| **4** | Supabase Storage buckets | PENDING | Buckets + RLS policies confirmed |
| **5** | Supabase Auth design | PENDING | Role model + User field mapping documented |

---

## Track B — Database (Phases 6–12)

| Phase | Title | Status | Gate |
|-------|-------|--------|------|
| **6** | Geography tables | PENDING | Counties seeded; FK indexes |
| **7** | Profiles + wallets | PENDING | RLS enabled; advisors clean |
| **8** | Vehicles + KYC documents | PENDING | Unique plate index; storage paths |
| **9** | Payments core | PENDING | TransactionLeg pattern; fintech rule review |
| **10** | Groups + permits + compliance | PENDING | All group/permit tables migrated |
| **11** | Comms + audit + misc | PENDING | All 31 entities mapped |
| **12** | RLS policies by portal | PENDING | Security advisor scan passes |

---

## Track C — Render infrastructure (Phases 13–16)

| Phase | Title | Status | Gate |
|-------|-------|--------|------|
| **13** | `render.yaml` Blueprint | PENDING | Blueprint validates; services defined |
| **14** | Staging frontend deploy | PENDING | Staging URL loads; deploy success |
| **15** | Staging API health check | PENDING | `/health` returns 200 |
| **16** | Environment variables + webhooks | PENDING | Staging webhook URLs registered externally |

---

## Track D — Application rewire (Phases 17–24)

| Phase | Title | Status | Gate |
|-------|-------|--------|------|
| **17** | Data access abstraction layer | PENDING | `dataClient.js` documented |
| **18** | Auth rewire | PENDING | Staging login/logout works |
| **19** | File upload rewire | PENDING | KYC photo upload to Supabase Storage |
| **20** | API: onboarding + identity | PENDING | QA checklist §1–2 on staging |
| **21** | API: SasaPay + webhook | PENDING | Sandbox STK + webhook logs |
| **22** | API: SMS + comms | PENDING | Test SMS on staging |
| **23** | API: admin + cron | PENDING | Cron logs visible in Render |
| **24** | Frontend portal rewire | PENDING | Full staging QA; `npm run build` passes |

---

## Track E — Production + cutover (Phases 25–26)

| Phase | Title | Status | Gate |
|-------|-------|--------|------|
| **25** | Production environment | PENDING | Prod URLs exist; smoke test only |
| **26** | Data migration + cutover | PENDING | PM sign-off; rollback plan documented |

---

## Phase completion template

When a phase finishes, append to [`MIGRATION_STATE.md`](MIGRATION_STATE.md):

```markdown
## Phase N complete — [title]
**Status**: COMPLETED
**Completed**: YYYY-MM-DD
**Evidence**: [build output / MCP result / deploy ID]
**PM action required**: [dashboard steps or "none"]
**Next phase**: N+1 — [title]
```

---

## Live Base44 rule (all phases)

**Do not modify production Base44 deployment or its webhook URLs until Phase 26.**

Migration work happens in `BodaSureNewest` on the `staging` branch (from Phase 1 onward).

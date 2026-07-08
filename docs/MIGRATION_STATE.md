# BodaSure Migration — Current State

> **SINGLE SOURCE OF TRUTH** for migration progress. Agents must read this file first.
> Last updated: 2026-07-08

---

## Current phase

| Field | Value |
|-------|-------|
| **CURRENT_PHASE** | **0** (COMPLETED) |
| **NEXT_PHASE** | **1** — New GitHub repo (BodaSureNewest) |
| **Active branch (migration)** | `staging` (from Phase 1; repo: BodaSureNewest) |
| **Live platform** | Base44 — **unchanged** |
| **Target stack** | Render (frontend + API + cron) + Supabase (DB + auth + storage) |

---

## Phase 0 complete — Migration governance

**Status**: COMPLETED  
**Completed**: 2026-07-08  
**Evidence**:
- Created `docs/MIGRATION_PHASES.md` (26-phase master list)
- Created `docs/MIGRATION_STATE.md` (this file)
- Created `docs/MIGRATION_ARCHITECTURE.md` (target stack reference)
- Created `.cursor/rules/bodasure-cloud-migration.mdc`
- Updated `AGENTS.md` with migration playbook
- `npm run build` passes (no application code changed)

**PM action required**: Review the three docs in `docs/` and confirm you are ready to say **"go to next phase"** for Phase 1.

**Next phase**: 1 — Create BodaSureNewest GitHub repo with `staging` and `main` branches

---

## Completed phases log

| Phase | Title | Completed | Evidence |
|-------|-------|-----------|----------|
| 0 | Migration governance | 2026-07-08 | Governance docs + cursor rule committed |

---

## Pending phases (summary)

Phases 1–26 are **PENDING**. See [`MIGRATION_PHASES.md`](MIGRATION_PHASES.md) for full gate checklists.

---

## Default migration choices (locked unless PM overrides)

| Decision | Choice |
|----------|--------|
| Supabase environments | Two projects: `bodasure-staging` + `bodasure-production` |
| Staging data | Fresh seed/test data first; live Base44 copy only at Phase 26 |
| API runtime | Single Render Web Service (Hono/Node) — not 40 separate Edge Functions |
| Document storage | Supabase Storage (not AWS S3) |
| Auth | Supabase Auth replacing `base44.auth.*` |

---

## Agent instructions

1. Read this file before any migration work.
2. Execute **only** `NEXT_PHASE` scope (currently Phase 1 when PM approves).
3. Do **not** skip phases or combine phases without PM approval.
4. Update this file when a phase completes.
5. Wait for PM to say **"go to next phase"** before incrementing `CURRENT_PHASE`.

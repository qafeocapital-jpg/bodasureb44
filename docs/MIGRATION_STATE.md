# BodaSure Migration — Current State

> **SINGLE SOURCE OF TRUTH** for migration progress. Agents must read this file first.
> Last updated: 2026-07-08

---

## Current phase

| Field | Value |
|-------|-------|
| **CURRENT_PHASE** | **1** (IN PROGRESS — awaiting BodaSureNewest repo push) |
| **NEXT_PHASE** | **2** — MCP verification (Render + Supabase) |
| **Migration repo** | `qafeocapital-jpg/BodaSureNewest` (create + push — see below) |
| **Default working branch** | `staging` (set in GitHub after repo exists) |
| **Legacy repo (live Base44)** | `qafeocapital-jpg/bodasureb44` — **unchanged** |
| **Live platform** | Base44 — **unchanged** |
| **Target stack** | Render (frontend + API + cron) + Supabase (DB + auth + storage) |

---

## Phase 1 — New GitHub repo (BodaSureNewest)

**Status**: IN PROGRESS  
**Started**: 2026-07-08  

**Completed automatically:**
- PR #2 merged to `bodasureb44` `main` (Phase 0 governance on main)
- Local `staging` branch created from `main`
- Bootstrap script: [`scripts/bootstrap-bodasure-newest.sh`](../scripts/bootstrap-bodasure-newest.sh)
- PM setup guide: [`docs/PHASE1_NEW_REPO_SETUP.md`](PHASE1_NEW_REPO_SETUP.md)

**PM action required (one-time, ~2 min):**
1. Create empty private repo **`BodaSureNewest`** on GitHub — [instructions](PHASE1_NEW_REPO_SETUP.md)
2. Tell agent: *"BodaSureNewest repo is created. Run bootstrap script and complete Phase 1."*
3. After push: set **default branch** to `staging` in GitHub repo settings

**Agent completes when repo exists:**
- Run `./scripts/bootstrap-bodasure-newest.sh`
- Verify both `main` and `staging` on remote
- Mark Phase 1 COMPLETED; set `CURRENT_PHASE` to 1 complete, `NEXT_PHASE` to 2

**Evidence (when complete):**
- Repo URL: `https://github.com/qafeocapital-jpg/BodaSureNewest`
- Branches: `main`, `staging`

---

## Phase 0 complete — Migration governance

**Status**: COMPLETED  
**Completed**: 2026-07-08  
**Evidence**: PR #2 merged (`fb27f68`); docs + cursor rules on `main`

---

## Completed phases log

| Phase | Title | Completed | Evidence |
|-------|-------|-----------|----------|
| 0 | Migration governance | 2026-07-08 | PR #2 merged to main |

---

## Pending phases (summary)

Phases 1–26: Phase 1 in progress. See [`MIGRATION_PHASES.md`](MIGRATION_PHASES.md).

---

## Default migration choices (locked unless PM overrides)

| Decision | Choice |
|----------|--------|
| Supabase environments | Two projects: `bodasure-staging` + `bodasure-production` |
| Staging data | Fresh seed/test data first; live Base44 copy only at Phase 26 |
| API runtime | Single Render Web Service (Hono/Node) |
| Document storage | Supabase Storage |
| Auth | Supabase Auth replacing `base44.auth.*` |

---

## Agent instructions

1. Read this file before any migration work.
2. Execute **only** the current phase scope.
3. Do **not** skip phases or combine phases without PM approval.
4. Update this file when a phase completes.
5. Wait for PM to say **"go to next phase"** before incrementing `CURRENT_PHASE` (except finish Phase 1 push when repo exists).

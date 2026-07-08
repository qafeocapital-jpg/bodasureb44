# Phase 1 — Create BodaSureNewest GitHub Repo

> One-time PM step (about 2 minutes). The cloud agent cannot create new GitHub repos on your org — you create the empty repo, then the agent pushes the code.

## Step 1 — Create empty repo on GitHub

1. Open [https://github.com/new](https://github.com/new)
2. **Owner:** `qafeocapital-jpg` (or your org)
3. **Repository name:** `BodaSureNewest`
4. **Visibility:** Private (recommended for fintech)
5. **Do NOT** add README, .gitignore, or license (repo must be empty)
6. Click **Create repository**

## Step 2 — Tell the agent

In Agent mode, say:

```
BodaSureNewest repo is created. Run scripts/bootstrap-bodasure-newest.sh and complete Phase 1.
```

The agent will push `main` and `staging` branches and verify.

## Step 3 — Set default branch (you)

1. Open `https://github.com/qafeocapital-jpg/BodaSureNewest/settings`
2. **Default branch** → switch from `main` to **`staging`**
3. Save

## What gets pushed

| Branch | Purpose |
|--------|---------|
| `main` | Future production (Render production from Phase 25) |
| `staging` | Day-to-day migration work (Render staging from Phase 14) |

Both branches include Phase 0 migration docs (`docs/MIGRATION_*.md`) and Cursor rules.

## Live Base44

**Unchanged.** The old repo (`bodasureb44`) and Base44 production are not affected.

## Manual alternative (local machine)

```bash
cd /path/to/bodasureb44
chmod +x scripts/bootstrap-bodasure-newest.sh
./scripts/bootstrap-bodasure-newest.sh https://github.com/qafeocapital-jpg/BodaSureNewest.git
```

---

## Troubleshooting: "Repository not found"

If the cloud agent reports **Repository not found**, the repo may exist but the **Cursor GitHub App** does not have access yet.

### Fix A — Grant app access (recommended, ~1 min)

1. Open **GitHub org** `qafeocapital-jpg` → **Settings**
2. Go to **Third-party access** → **GitHub Apps** → **Cursor** (or your cloud agent app) → **Configure**
3. Under **Repository access**, add **`BodaSureNewest`** (or select "All repositories")
4. Save, then tell the agent: *"Retry bootstrap script and complete Phase 1."*

### Fix B — Import from bodasureb44 (no push needed)

If the repo is empty or access is hard to fix:

1. Delete the empty `BodaSureNewest` repo (Settings → Danger zone)
2. Open [github.com/new/import](https://github.com/new/import)
3. **Clone URL:** `https://github.com/qafeocapital-jpg/bodasureb44.git`
4. **Owner:** `qafeocapital-jpg` · **Name:** `BodaSureNewest` · **Private**
5. Click **Begin import** (copies all code to `main`)
6. After import: branch dropdown → type **`staging`** → **Create branch: staging** from `main`
7. Settings → Default branch → set to **`staging`**
8. Tell the agent: *"Import done, Phase 1 complete."*

### Fix C — Confirm repo location

Verify the repo URL in your browser:

`https://github.com/qafeocapital-jpg/BodaSureNewest`

It must be under org **`qafeocapital-jpg`**, not a personal account.

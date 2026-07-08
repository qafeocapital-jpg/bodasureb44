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

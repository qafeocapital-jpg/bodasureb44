#!/usr/bin/env bash
# Push main + staging to the BodaSureNewest migration repo.
# Prerequisite: create an empty private repo on GitHub first (see docs/PHASE1_NEW_REPO_SETUP.md).
set -euo pipefail

REPO_URL="${1:-https://github.com/qafeocapital-jpg/BodaSureNewest.git}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> BodaSureNewest bootstrap"
echo "    Remote: $REPO_URL"

git fetch origin main
git checkout main
git pull origin main

if ! git show-ref --verify --quiet refs/heads/staging; then
  git checkout -b staging main
else
  git checkout staging
  git merge main --no-edit
fi

git checkout main

git remote remove bodasure-newest 2>/dev/null || true
git remote add bodasure-newest "$REPO_URL"

echo "==> Pushing main..."
git push -u bodasure-newest main

echo "==> Pushing staging..."
git push -u bodasure-newest staging

echo ""
echo "==> Success."
echo "    Next (GitHub UI): Settings → General → Default branch → set to 'staging'"
echo "    Repo: ${REPO_URL%.git}"

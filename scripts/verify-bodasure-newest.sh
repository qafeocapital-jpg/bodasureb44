#!/usr/bin/env bash
# Verify BodaSureNewest repo has main + staging branches (Phase 1 gate).
set -euo pipefail

REPO="${1:-qafeocapital-jpg/BodaSureNewest}"

echo "==> Verifying $REPO"

if ! gh repo view "$REPO" --json name,defaultBranchRef,url 2>/dev/null; then
  echo "FAIL: Cannot access $REPO — grant Cursor GitHub App access or use Import (see docs/PHASE1_NEW_REPO_SETUP.md)"
  exit 1
fi

MAIN=$(git ls-remote "https://github.com/${REPO}.git" refs/heads/main 2>/dev/null | wc -l)
STAGING=$(git ls-remote "https://github.com/${REPO}.git" refs/heads/staging 2>/dev/null | wc -l)

echo "main branch on remote: $([ "$MAIN" -gt 0 ] && echo YES || echo NO)"
echo "staging branch on remote: $([ "$STAGING" -gt 0 ] && echo YES || echo NO)"

if [ "$MAIN" -gt 0 ] && [ "$STAGING" -gt 0 ]; then
  echo "PASS: Phase 1 gate satisfied"
  exit 0
fi

echo "FAIL: Missing branches — run scripts/bootstrap-bodasure-newest.sh"
exit 1

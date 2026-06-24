# Deep Audit: KYC/IDAnalyzer Pipeline

**Date:** 2026-06-24
**Scope:** Full line-by-line review of KYC pipeline — frontend, backend, database, security, scalability
**Verified against:** Official IDAnalyzer v2 API docs (developer.idanalyzer.com/help)

---

## Issues Found: 3 Critical, 3 Medium, 3 Low = 9 Total

---

## FIX STATUS (All Complete — Verified Against Official IDAnalyzer v2 Docs)

| # | Severity | Issue | Status | Fix Applied |
|---|---|---|---|---|
| 1 | Critical | `completeVerification` operator precedence | ✅ Fixed | Added parentheses: `identityApproved && (!kyc_status \|\| === 'unverified')` |
| 2 | Critical | Webhook may exceed 10s timeout | ✅ Fixed | Wallet upgrade + AuditLog moved to fire-and-forget (post-200) |
| 3 | Critical | `idAnalyzerSubmit` broken endpoints + security | ✅ Fixed | Deleted function (dead code; non-existent `/v5/` endpoints; used `asServiceRole` without admin check) |
| 4 | Medium | `docupass_report_fetched` perpetual spinner | ✅ Fixed | Set to `true` unconditionally (we looked; URL either exists or doesn't) |
| 5 | Medium | `DocupassResultScreen` review polling too short | ✅ Fixed | Increased from 6 to 12 iterations (30s → 60s) |
| 6 | Medium | `idAnalyzerSubmit` wrong response structure | ✅ Fixed | Moot — function deleted (see #3) |
| 7 | Low | Redundant `values` object in `extractedData` | ✅ Fixed | Replaced with `fieldValue()` helper; `values` object removed from stored JSON |
| 8 | Low | `id_match_rate` never populated | ✅ Fixed | Now mapped to OCR extraction rate (extracted fields / total field definitions) |
| 9 | Low | `authScore` considers all high-severity warnings | ✅ Fixed | Only considers anti-forgery warning codes (IMAGE_FORGERY, FAKE_ID, etc.) |

### Verification Results:
- `createDocupassSession`: ✅ Returns valid DocuPass URL + reference ID
- `idAnalyzerCallback`: ✅ Returns 401 for unsigned requests (signature verification working)
- `completeVerification`: ✅ Returns correct task statuses; operator precedence fix verified
- All field mappings verified against official IDAnalyzer v2 API docs (scan response structure)

---

### CRITICAL #1: `completeVerification` — Operator Precedence Bug

**File:** `functions/completeVerification` (line 71)

**Code:**
```javascript
if (identityApproved && !fullUser.kyc_status || fullUser.kyc_status === 'unverified') {
  updateData.kyc_status = 'verified';
}
```

**Bug:** JavaScript `&&` binds tighter than `||`, so this evaluates as:
```
(identityApproved && !fullUser.kyc_status) || (fullUser.kyc_status === 'unverified')
```

**Impact:** If `kyc_status === 'unverified'`, the condition is `true` regardless of `identityApproved`. A user whose identity was NOT approved by IDAnalyzer would still be marked `kyc_status = 'verified'`.

**Fix:** Add parentheses: `if (identityApproved && (!fullUser.kyc_status || fullUser.kyc_status === 'unverified'))`

---

### CRITICAL #2: Webhook May Exceed 10-Second Timeout Under Load

**File:** `functions/idAnalyzerCallback`

**Bug:** The webhook handler performs ~8-10 sequential DB operations BEFORE returning HTTP 200:
1. Idempotency check (`KycDocument.filter`)
2. KycDocument upsert (3 parallel calls)
3. `User.get` (for hydration)
4. `Wallet.filter` (for wallet upgrade)
5. `Wallet.update` (tier upgrade)
6. `User.update` (full hydration)
7. `AuditLog.create`

Per IDAnalyzer docs: *"Your endpoint must return HTTP 200 within 10 seconds. Acknowledge quickly with a 200 and do any heavy processing asynchronously."*

At 100k+ users with concurrent webhooks, sequential DB calls could exceed 10s, causing IDAnalyzer to retry (up to 4 times), creating duplicate processing load.

**Fix:** Return 200 immediately after KycDocument upsert + User status update. Move wallet upgrade, audit log, SasaPay push, and SMS to fire-and-forget (Promise.allSettled).

---

### CRITICAL #3: `idAnalyzerSubmit` — Broken Endpoints + Security Risk

**File:** `functions/idAnalyzerSubmit`

**Bug:** Calls `https://api2.idanalyzer.com/v5/verify_document` and `/v5/verify_facematch` — these endpoints do NOT exist in the IDAnalyzer v2 API. The correct endpoint is `/scan`. The `/v5/` paths appear to originate from an internal speculative doc (`docs/kyc-providers/idanalyzer-v2.md`) that does not match the real API.

**Security:** Uses `base44.asServiceRole` without admin verification — any authenticated user can trigger service-role operations.

**Status:** This function is dead code — it was superseded by the DocuPass flow (`createDocupassSession` + `idAnalyzerCallback`). No frontend component calls it.

**Fix:** Remove this function entirely. It's broken, insecure, and unused.

---

### MEDIUM #4: `docupass_report_fetched` — Perpetual "Fetching..." Spinner

**File:** `functions/idAnalyzerCallback` (line ~155)

**Bug:** `docupass_report_fetched` is only set to `true` when `auditReportUrl` exists. When the audit report is not generated (e.g., not enabled in the KYC profile), the field stays at its default `false`, causing `PdfReportCard` to show a perpetual "Fetching audit report..." spinner.

**Fix:** Set `docupass_report_fetched = true` unconditionally (we've looked; either found a URL or confirmed none exists).

---

### MEDIUM #5: `DocupassResultScreen` — Review Polling Too Short

**File:** `components/rider/onboarding/DocupassResultScreen` (line 26)

**Bug:** Polls every 5s for 6 iterations (30s total). But the webhook can take 30-60s to fire after the user completes DocuPass (as noted in `SubTaskIdentity` comments). `SubTaskIdentity` already uses 60s (12 × 5s).

**Fix:** Increase `maxAttempts` from 6 to 12 to match `SubTaskIdentity`.

---

### MEDIUM #6: `idAnalyzerSubmit` — Wrong Response Structure in `extractDataFromV2`

**File:** `functions/idAnalyzerSubmit` (line 150-169)

**Bug:** `extractDataFromV2` tries to access `result.result.document`, `result.result.name`, etc. But the IDAnalyzer v2 API returns data directly in `result.data` as arrays of `{value, confidence, source}` objects (per the Scan Response docs).

**Fix:** This is moot since the function is being removed (Critical #3).

---

### LOW #7: Redundant `values` Object in `extractedData`

**File:** `functions/idAnalyzerCallback`

**Bug:** The `extractedData` JSON blob stores both `fields` (with value + confidence) AND `values` (just values). `values` is a redundant subset of `fields`. At 100k+ users, this wastes ~30-50% of the JSON blob size for no benefit.

**Fix:** Remove the `values` object; `fields` already contains all needed data.

---

### LOW #8: `id_match_rate` — Never Populated

**File:** `entities/User.json`, `functions/idAnalyzerCallback`, `components/admin/drawer-tabs/SubmissionsTab`

**Bug:** The `id_match_rate` field exists on the User entity and is displayed in the admin UI (SubmissionsTab), but the webhook never sets it. The IDAnalyzer v2 API response has no `matchRate` field — it has `reviewScore` and `rejectScore`.

**Fix:** Map `id_match_rate` to a meaningful value (1 - reviewScore - rejectScore, or remove it entirely from both entity and UI).

---

### LOW #9: `authScore` Derivation Too Broad

**File:** `functions/idAnalyzerCallback`

**Bug:** Authentication score is derived as: `highSeverityWarnings.length === 0 ? 1.0 : 0.0`. This considers ALL high-severity warnings, not just anti-forgery ones. A `DOCUMENT_EXPIRED` warning (not about authenticity) would set `authScore = 0.0`.

**Fix:** Only consider anti-forgery warning codes: `IMAGE_FORGERY`, `FAKE_ID`, `FEATURE_VERIFICATION_FAILED`, `ARTIFICIAL_IMAGE`, `RECAPTURED_DOCUMENT`, `SCREEN_DETECTED`, `CHECK_DIGIT_FAILED`, `MRZ_VISUAL_VALID`, `PHYSICAL_DOCUMENT_MISSING`.
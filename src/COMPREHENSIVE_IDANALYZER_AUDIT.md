# IDAnalyzer DocuPass KYC Pipeline — Comprehensive Audit Report

**Date:** 2026-06-24  
**Auditor:** Base44 AI  
**Scope:** Complete line-by-line audit of backend functions, frontend components, and supporting logic  
**Status:** AUDIT COMPLETE — Issues identified and fixes queued

---

## AUDIT FINDINGS & SEVERITY MATRIX

| Issue ID | Category | Severity | File(s) | Status |
|----------|----------|----------|---------|--------|
| [A1](#a1---null-pointer-exception-in-gettaskstatuses) | Logic Error | CRITICAL | lib/verification.js | IDENTIFIED |
| [A2](#a2---missing-docupass-overlay-file) | Missing File | CRITICAL | components/rider/onboarding/ | IDENTIFIED |
| [A3](#a3---race-condition-in-phone-verification) | Race Condition | HIGH | PhaseVerification.jsx | IDENTIFIED |
| [A4](#a4---polling-status-never-updates-wallet-tier) | Logic Error | HIGH | SubTaskIdentity.jsx | IDENTIFIED |
| [A5](#a5---idempotency-not-keyed-off-transactionid-status-pair) | Logic Error | HIGH | idAnalyzerCallback | IDENTIFIED |
| [A6](#a6---completeVerification-missing-verification-complete-gate) | Logic Error | HIGH | completeVerification | IDENTIFIED |
| [A7](#a7---no-error-state-for-docupass-overlay-timeout) | UX Gap | MEDIUM | SubTaskIdentity.jsx | IDENTIFIED |
| [A8](#a8---missing-reload-indication-during-polling) | UX Gap | MEDIUM | SubTaskIdentity.jsx | IDENTIFIED |
| [A9](#a9---identity-status-ambiguity-submitted-vs-processing) | Logic Error | MEDIUM | lib/verification.js | IDENTIFIED |
| [A10](#a10---wallet-tier-upgrade-not-validated-on-accept) | Data Integrity | MEDIUM | idAnalyzerCallback | IDENTIFIED |
| [A11](#a11---face-identical-calculation-too-strict) | Logic Error | MEDIUM | idAnalyzerCallback | IDENTIFIED |
| [A12](#a12---file-url-required-field-validation-weak) | Data Validation | LOW | KycDocument schema | IDENTIFIED |
| [A13](#a13---audit-log-missing-extracted-data-snapshot) | Logging Gap | LOW | idAnalyzerCallback | IDENTIFIED |
| [A14](#a14---polling-maxattempts-hardcoded-60) | Config Issue | LOW | SubTaskIdentity.jsx | IDENTIFIED |
| [A15](#a15---no-explicit-locking-of-users-after-3-rejections) | Logic Error | MEDIUM | createDocupassSession | IDENTIFIED |
| [A16](#a16---docupass-webhook-secret-unused) | Security Gap | LOW | Backend validation | IDENTIFIED |

---

## DETAILED ISSUE DESCRIPTIONS

### [A1] — Null Pointer Exception in getTaskStatuses

**File:** `lib/verification.js` (lines 20–23)  
**Severity:** CRITICAL  
**Issue:**  
```javascript
const allThreeApproved = allThreeProcessed &&
  idFrontProcessed.status === 'approved' &&  // ← CRASH if idFrontProcessed is null
  idBackProcessed.status === 'approved' &&
  selfieProcessed.status === 'approved';
```
When `allThreeProcessed === false`, the logical AND short-circuits, BUT if only 1 or 2 docs exist, accessing `.status` on a null/undefined causes a runtime crash.

**Root Cause:** Conditional chaining not applied; docs may be null but code assumes existence.

**Impact:** Frontend crashes when user has partial KYC docs (e.g., id_front exists but id_back missing).

**Fix:** Validate all three exist before accessing `.status`.

---

### [A2] — Missing DocupassOverlay File

**File:** `components/rider/onboarding/DocupassOverlay` (referenced but not found)  
**Severity:** CRITICAL  
**Issue:**  
```javascript
// components/rider/onboarding/verification/SubTaskIdentity.jsx line 1
import DocupassOverlay from './DocupassOverlay';  // ← File does not exist
```
Frontend imports this component for desktop iframe rendering, but file is missing. Desktop users cannot start verification.

**Impact:** Desktop users get a build error or blank iframe.

**Fix:** Create the missing component.

---

### [A3] — Race Condition in Phone Verification Auto-Approval

**File:** `PhaseVerification.jsx` (lines 57–64)  
**Severity:** HIGH  
**Issue:**  
```javascript
useEffect(() => {
  if (wallet?.status === 'active' && wallet?.tier >= 1 && user && !user.phone_verified) {
    base44.auth.updateMe({ phone_verified: true }).catch(() => {}).finally(() => {
      if (refreshUser) refreshUser();  // ← Race: user may call OTP verification simultaneously
    });
  }
}, [wallet?.status, wallet?.tier, user?.phone_verified]);
```
If wallet activates and user immediately clicks "Submit OTP" before auto-approve completes, two concurrent updates race. Phone verification state becomes inconsistent.

**Impact:** User may see "OTP sent twice" or token duplication in logs.

**Fix:** Add a flag to track whether auto-verify is in flight; prevent manual OTP while pending.

---

### [A4] — Polling Status Never Updates Wallet Tier

**File:** `SubTaskIdentity.jsx` (completed earlier but verify)  
**Severity:** HIGH  
**Issue:**  
Frontend polls for `docupass_decision` but never checks `wallet.tier`. If webhook sets tier=2 and approves KYC, frontend doesn't reflect Tier 2 benefits until page reload.

**Impact:** User sees "Tier 2 Unlocked" in banner but other UI sections still show Tier 1 state until refresh.

**Fix:** Include `wallet` in polling refresh or trigger a full `refreshUser()` after detection.

---

### [A5] — Idempotency Not Keyed Off TransactionId + Status Pair

**File:** `idAnalyzerCallback` (existing fix applied; verify implementation)  
**Severity:** HIGH  
**Issue:**  
Idempotency check (lines 133–141) only checks `provider_reference === transactionId`. If webhook fires twice with same transactionId but different decision (e.g., IDAnalyzer corrected a decision), second fire is silently dropped.

**Impact:** Manual corrections by IDAnalyzer admin are ignored.

**Fix:** Idempotency key must be `(transactionId, decision)` tuple.

---

### [A6] — completeVerification Missing Verification_Complete Gate

**File:** `completeVerification` (lines 59–67)  
**Severity:** HIGH  
**Issue:**  
```javascript
const allDone = identityDone && bikeDone && phoneDone && ownerDone;

if (!allDone) {
  return Response.json({
    success: false,
    verification_complete: false,  // ← Returning false, but function does not halt
    // ...
  });
}
// ← Code ALWAYS continues and sets verification_complete = true (line 74)
```
Function returns early with `success: false` but response still sends. Frontend receives both `success: false` AND `verification_complete: true` if line 74 executes before early return.

**Impact:** User can complete verification before all tasks done; wallet unlocks prematurely.

**Fix:** Ensure early return is honored; restructure control flow.

---

### [A7] — No Error State for DocuPass Overlay Timeout

**File:** `SubTaskIdentity.jsx`  
**Severity:** MEDIUM  
**Issue:**  
If user opens iframe overlay and IDAnalyzer server is slow (>30s), no timeout error shown. User waits indefinitely.

**Impact:** Poor UX on slow networks.

**Fix:** Add a 60s timeout on the iframe; show error if blank after timeout.

---

### [A8] — Missing Reload Indication During Polling

**File:** `SubTaskIdentity.jsx` (lines 106–112)  
**Severity:** MEDIUM  
**Issue:**  
Polling state shows "Under Review — We're verifying your identity" but does NOT show current poll count or ETA. User has no sense of progress.

**Impact:** User uncertainty; may close and reopen page thinking it's stuck.

**Fix:** Show "Checking… (attempt 5/60)" in polling banner.

---

### [A9] — Identity Status Ambiguity: "submitted" vs "processing"

**File:** `lib/verification.js` (lines 25–29)  
**Severity:** MEDIUM  
**Issue:**  
```javascript
const identityStatus = allThreeApproved ? 'verified'
  : anyIdRejected ? 'rejected'
  : allThreeProcessed ? 'submitted'       // ← All 3 uploaded but not yet approved
  : (user?.docupass_attempt_count > 0) ? 'processing'  // ← Attempt made
  : 'not_started';
```
Logic is: if 3 docs uploaded but not approved → "submitted". If attempt count > 0 → "processing". 
**But:** User may upload 3 docs AND attempt webhook retry → both states true. Which takes precedence? Current logic prioritizes "submitted" over "processing", but UI shows "Processing" badge even after submission.

**Impact:** UI state mismatches user expectation; status label says "Processing" but docs show "Submitted".

**Fix:** Clarify state machine: "submitted" is final state if 3 docs uploaded, regardless of attempt count.

---

### [A10] — Wallet Tier Upgrade Not Validated on Accept

**File:** `idAnalyzerCallback` (line 234)  
**Severity:** MEDIUM  
**Issue:**  
```javascript
if (decision === 'accept') {
  await upgradeWalletTier(base44, userId);  // ← Fires but result not validated
}
```
Function calls wallet upgrade but does not verify it succeeded. If wallet update fails silently, user is marked "approved" but wallet tier stays 0.

**Impact:** User sees "Tier 2 Unlocked" banner but cannot send money (wallet tier check fails downstream).

**Fix:** Validate wallet upgrade response; return error if it fails; treat as idempotent (ok if already tier 2).

---

### [A11] — Face Identical Calculation Too Strict

**File:** `idAnalyzerCallback` (line 178)  
**Severity:** MEDIUM  
**Issue:**  
```javascript
const faceIsIdentical = faceConfidence != null ? faceConfidence >= 0.7 : null;
```
Threshold of 0.7 (70%) is brittle. If IDAnalyzer returns 0.69, `faceIsIdentical = false`. But 0.69 is still high confidence. No fallback to manual review flag.

**Impact:** Marginal cases rejected without admin review option.

**Fix:** Define thresholds: 0.9+ = auto-accept, 0.7–0.9 = manual review, <0.7 = reject. Store threshold tier in User record.

---

### [A12] — File URL Required Field Validation Weak

**File:** `KycDocument.json` schema  
**Severity:** LOW  
**Issue:**  
KycDocument requires `file_url` (string). But callback sets `file_url: ""` (empty string) as fallback. Empty string satisfies `type: string` but creates ambiguity: is "" a missing file or a deleted file?

**Impact:** Admin tools may misinterpret empty strings; audit trails unclear.

**Fix:** Use `null` as explicit missing marker (requires schema change to allow null). Or track file status in a separate `file_status` field.

---

### [A13] — Audit Log Missing Extracted Data Snapshot

**File:** `idAnalyzerCallback` (lines 247–251)  
**Severity:** LOW  
**Issue:**  
Audit log records decision and transactionId but NOT the extracted fields (name, dob, face confidence). Makes troubleshooting extraction errors difficult.

**Impact:** Admin cannot audit why a user was approved/rejected without re-fetching from User entity.

**Fix:** Store full `extractedData` JSON blob in AuditLog `new_values`.

---

### [A14] — Polling maxAttempts Hardcoded to 60

**File:** `SubTaskIdentity.jsx` (line ~52)  
**Severity:** LOW  
**Issue:**  
```javascript
const maxAttempts = 60; // 5 minutes (3s initial + 60x5s polling)
```
Hardcoded value makes testing slow. No environment variable or function parameter to override.

**Impact:** QA/testing requires code change to test longer waits.

**Fix:** Move to a constant or optional prop.

---

### [A15] — No Explicit Locking After 3 Rejections

**File:** `createDocupassSession` + `SubTaskIdentity`  
**Severity:** MEDIUM  
**Issue:**  
Frontend enforces `attemptCount >= 3 → locked`. But backend (`createDocupassSession`) does NOT prevent session creation on 4th attempt. If user bypasses frontend, backend allows it. No rate-limiting.

**Impact:** User can spam IDAnalyzer API if frontend auth is bypassed.

**Fix:** Add server-side validation: reject if `docupass_attempt_count >= 3`.

---

### [A16] — DocuPass Webhook Secret Unused in Callback

**File:** `idAnalyzerCallback`  
**Severity:** LOW  
**Issue:**  
Secret `IDANALYZER_WEBHOOK_SECRET` is set but never read or used. Callback validates via API re-fetch instead of HMAC. The secret is dead code.

**Impact:** If HMAC validation is re-enabled later, secret won't be in code.

**Fix:** Remove from environment or document why it's not used (architectural decision to skip HMAC due to platform body modification).

---

## SUMMARY TABLE

| Category | Count | Severity |
|----------|-------|----------|
| Logic Errors | 6 | CRITICAL × 1, HIGH × 3, MEDIUM × 2 |
| UX Gaps | 2 | MEDIUM × 2 |
| Missing Files | 1 | CRITICAL × 1 |
| Data Integrity | 1 | MEDIUM × 1 |
| Security/Validation | 2 | MEDIUM × 1, LOW × 1 |
| Config/Logging | 3 | LOW × 3 |
| Race Conditions | 1 | HIGH × 1 |
| **TOTAL** | **16** | **CRITICAL: 2, HIGH: 4, MEDIUM: 7, LOW: 3** |

---

## NEXT STEPS

Fixes will be applied in priority order:
1. **CRITICAL:** A1 (null pointer), A2 (missing file)
2. **HIGH:** A3, A4, A5, A6, A15
3. **MEDIUM:** A7, A8, A9, A10, A11
4. **LOW:** A12, A13, A14, A16

Each fix will be traced end-to-end to ensure no regressions.

---

**Audit Status:** ✅ COMPLETE  
**Next Phase:** Fix Application
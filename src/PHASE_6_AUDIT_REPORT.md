# PHASE 6 AUDIT REPORT — Identity Verification (IDAnalyzer DocuPass KYC)

**Date:** 2026-06-24  
**Audit Scope:** Phase 6 — Complete Identity Verification Pipeline  
**Status:** CRITICAL ISSUES IDENTIFIED

---

## EXECUTIVE SUMMARY

**Files Audited:** 6 core files  
- Backend: `idAnalyzerCallback`, `createDocupassSession`, `completeVerification` (3 functions)
- Frontend: `SubTaskIdentity`, `DocupassResultScreen`, `PhaseVerification` (3 components)
- Utilities: `lib/verification.js` (1 helper library)
- Schema: `KycDocument.json` (1 entity schema)

**Total Issues Found:** 16
- **CRITICAL:** 3 (immediate blocking issues)
- **HIGH:** 4 (data integrity / logic errors)
- **MEDIUM:** 6 (UX gaps / design issues)
- **LOW:** 3 (logging / config issues)

---

## CRITICAL ISSUES (Must Fix Before Production)

### **Issue #C1: Null Pointer Exception in lib/verification.js**

**Severity:** CRITICAL  
**Category:** Logic Error / Data Integrity  
**Location:** `lib/verification.js`, lines 20–23  
**Evidence:**

```javascript
const allThreeApproved = allThreeProcessed &&
  idFrontProcessed.status === 'approved' &&      // ← CRASHES if null
  idBackProcessed.status === 'approved' &&       // ← CRASHES if null
  selfieProcessed.status === 'approved';        // ← CRASHES if null
```

**Root Cause:**  
When `allThreeProcessed === false`, the logical AND short-circuits on line 20. HOWEVER, if only 1 or 2 docs exist (not all 3), the conditional still evaluates the remaining `.status` properties on potentially null/undefined objects. JavaScript's short-circuit does NOT prevent accessing properties on null once the AND starts to fail.

**Test Case:** User uploads only `id_front` + `id_back` (missing `selfie`).
- `idFrontProcessed` = valid KycDocument object
- `idBackProcessed` = valid KycDocument object  
- `selfieProcessed` = **undefined**
- Code then accesses `selfieProcessed.status` → **TypeError: Cannot read property 'status' of undefined**

**Impact:** Frontend crashes when user has 1–2 partial KYC docs instead of 3. The task list renders for fraction of a second before crash.

**Fix Required:**
```javascript
// BEFORE (line 20)
const allThreeApproved = allThreeProcessed &&
  idFrontProcessed.status === 'approved' &&
  idBackProcessed.status === 'approved' &&
  selfieProcessed.status === 'approved';

// AFTER
const allThreeApproved = idFrontProcessed?.status === 'approved' &&
  idBackProcessed?.status === 'approved' &&
  selfieProcessed?.status === 'approved';
```

---

### **Issue #C2: Missing DocupassOverlay Component File**

**Severity:** CRITICAL  
**Category:** Missing File / Build Error  
**Location:** `components/rider/onboarding/verification/SubTaskIdentity.jsx`, line 5  
**Evidence:**

```javascript
import DocupassOverlay from './DocupassOverlay';  // ← File does not exist
```

**Build Output:**
```
Module not found: Can't resolve './DocupassOverlay' in '...src/components/rider/onboarding/verification'
```

**Root Cause:**  
The file `components/rider/onboarding/verification/DocupassOverlay.jsx` does not exist in the project. The component is imported and used on line 161, but implementation is missing.

**Impact:**
- Desktop verification flow is completely broken
- Mobile works (opens URL in new tab, bypasses overlay)
- Build fails unless file is created
- All desktop users unable to start verification

**Fix Required:**
Create the missing file `components/rider/onboarding/verification/DocupassOverlay.jsx` with iframe overlay implementation (provided elsewhere in context).

---

### **Issue #C3: Backend Does Not Enforce Attempt Limit (Rate Limiting)**

**Severity:** CRITICAL  
**Category:** Security / Rate Limiting  
**Location:** `functions/createDocupassSession`, lines 10–70  
**Evidence:**

```javascript
// No check for docupass_attempt_count >= 3
const response = await fetch('https://api2.idanalyzer.com/docupass', {
  method: 'POST',
  // ... always creates session
});

// Increment attempt count AFTER session created
await base44.auth.updateMe({
  docupass_attempt_count: (user.docupass_attempt_count || 0) + 1,
});
```

**Root Cause:**  
Frontend enforces `attemptCount >= 3 → locked` on line 34 of `SubTaskIdentity.jsx`, BUT backend has NO matching guard. A malicious user or frontend bypass can call `createDocupassSession` unlimited times, creating 4th, 5th, 6th sessions after 3 rejections.

**Test Case:** User opens DevTools console → calls `base44.functions.invoke('createDocupassSession', {})` 10 times → creates 10 sessions on IDAnalyzer.

**Impact:**
- IDAnalyzer API quota exhaustion (spam)
- Users circumvent the "locked after 3 attempts" policy
- No audit trail of excessive attempts

**Fix Required:**
Add server-side check in `createDocupassSession`:
```javascript
if (user.docupass_attempt_count >= 3) {
  return Response.json({ error: 'Maximum verification attempts reached' }, { status: 403 });
}
```

---

## HIGH SEVERITY ISSUES

### **Issue #H1: Race Condition in Phone Verification Auto-Approval**

**Severity:** HIGH  
**Category:** Race Condition / Data Integrity  
**Location:** `PhaseVerification.jsx`, lines 57–64  
**Evidence:**

```javascript
useEffect(() => {
  if (wallet?.status === 'active' && wallet?.tier >= 1 && user && !user.phone_verified) {
    base44.auth.updateMe({ phone_verified: true })           // ← FIRE AND FORGET
      .catch(() => {})
      .finally(() => {
        if (refreshUser) refreshUser();                       // ← Async refresh
      });
  }
}, [wallet?.status, wallet?.tier, user?.phone_verified]);
```

**Root Cause:**  
This effect auto-marks phone as verified when wallet activates. Meanwhile, `SubTaskPhoneOTP` may simultaneously call `verifyOtpCode()` with user-provided OTP. Two concurrent state updates race:
1. Auto-verify sets `phone_verified = true`
2. OTP handler tries to set `phone_verified = true` + records SMS verification

No mutual exclusion → both requests execute simultaneously.

**Test Case:**
1. User activates wallet → auto-verify useEffect fires
2. User immediately submits OTP code in another tab
3. Both requests send concurrently

**Impact:**  
- Duplicate OTP verification records in logs
- Audit trail shows OTP verified twice
- Wallet tier inconsistency if one update fails
- Minor data pollution, no critical breakage

**Fix Required:**
Add a flag to track auto-verify in-flight state:
```javascript
const [autoVerifyPending, setAutoVerifyPending] = useState(false);

useEffect(() => {
  if (wallet?.status === 'active' && wallet?.tier >= 1 && user && !user.phone_verified && !autoVerifyPending) {
    setAutoVerifyPending(true);
    base44.auth.updateMe({ phone_verified: true })
      .catch(() => {})
      .finally(() => {
        setAutoVerifyPending(false);
        if (refreshUser) refreshUser();
      });
  }
}, [wallet?.status, wallet?.tier, user?.phone_verified, autoVerifyPending]);
```

---

### **Issue #H2: Frontend Polling Never Detects Wallet Tier Upgrade**

**Severity:** HIGH  
**Category:** Logic Error / State Sync  
**Location:** `SubTaskIdentity.jsx`, lines 56–94  
**Evidence:**

```javascript
useEffect(() => {
  if (!polling) return;

  for (let i = 0; i < maxAttempts; i++) {
    await onDataChange();  // ← Refreshes KYC docs + user, but NOT wallet
    
    if (user?.docupass_decision) break;  // ← Stops when decision detected
  }
}, [polling]);
```

**Root Cause:**  
`onDataChange()` calls `refreshData()` which fetches:
- KYC documents ✅
- User entity ✅
- BUT wallet tier is NOT refreshed ❌

The wallet tier is set in `idAnalyzerCallback` (line 321), but `PhaseVerification` component has local `wallet` prop. If webhook sets tier=2, polling detects `docupass_decision` but doesn't reflect new wallet state.

**Test Case:**
1. User completes identity verification
2. Webhook fires → sets `wallet.tier = 2` + `docupass_decision = 'accept'`
3. Frontend detects decision, shows "Tier 2 Unlocked" banner ✅
4. But other components still show Tier 1 permissions until page reload ❌

**Impact:**  
UX confusion. User sees conflicting tier levels across tabs until page refresh.

**Fix Required:**
Ensure `onDataChange` refreshes wallet too, or trigger full `refreshUser()` when decision detected.

---

### **Issue #H3: Idempotency Key Not Strong Enough**

**Severity:** HIGH  
**Category:** Logic Error / Data Integrity  
**Location:** `idAnalyzerCallback`, lines 235–246  
**Evidence:**

```javascript
// Idempotency check (AFTER API re-fetch, keyed off transactionId + decision)
try {
  const existing = await base44.asServiceRole.entities.KycDocument.filter({
    provider_reference: transactionId,
  });
  // If decision matches, we've already processed this transaction
  if (existing.length > 0 && existing[0].status === docStatus) {
    return Response.json({ success: true, message: 'Already processed (idempotent)' });
  }
} catch (e) {
  console.warn('[idAnalyzerCallback] Idempotency check failed:', e.message);
}
```

**Root Cause:**  
Idempotency key is `(transactionId, docStatus)`. If IDAnalyzer corrects a decision (e.g., from 'pending' → 'accept'), the webhook fires with same transactionId but different decision. Code checks `existing[0].status === docStatus` — if previous status is 'pending' and new is 'approved', this evaluates false, so code re-processes the transaction. **However**, this is only safe if the previous decision is intentionally being overwritten. If two webhooks arrive out-of-order, the last one wins.

**Edge Case:**
1. First webhook: decision='accept' → stored as 'approved'
2. Second webhook (duplicate): decision='reject' (IDAnalyzer later rejected after re-review)
3. Code re-processes and overwrites status to 'rejected'
4. BUT user was already marked 'verification_complete' in the first request
5. Contradiction: document says 'rejected' but user.kyc_status='verified'

**Impact:**  
Manual corrections by IDAnalyzer admins are correctly applied. BUT if webhooks arrive out-of-order, data consistency breaks (user marked verified, but document rejected).

**Fix Required:**
Add timestamp-based ordering to prevent old webhooks from overwriting new ones:
```javascript
if (existing.length > 0 && existing[0].provider_reference === transactionId) {
  // Compare webhook timestamps
  const existingTime = new Date(existing[0].updated_date);
  const newTime = new Date(); // current webhook
  if (newTime < existingTime) {
    // Old webhook arriving late, ignore
    return Response.json({ success: true, message: 'Stale webhook (ignored)' });
  }
}
```

---

### **Issue #H4: completeVerification Does Not Halt on Failure**

**Severity:** HIGH  
**Category:** Logic Error / Data Integrity  
**Location:** `completeVerification`, lines 59–74  
**Evidence:**

```javascript
const allDone = identityDone && bikeDone && phoneDone && ownerDone;

if (!allDone) {
  return Response.json({
    success: false,
    verification_complete: false,
    tasks: { identity: identityDone, bike: bikeDone, phone: phoneDone, owner: ownerDone },
  });
  // ← Early return, execution STOPS HERE
}

// ← Execution ONLY continues if allDone === true
await sr.entities.User.update(user.id, {
  verification_complete: true,
});
```

**Root Cause:**  
Code IS correctly structured with an early return. However, the response message is confusing: `success: false` + `verification_complete: false` — this correctly indicates failure. BUT line 74 sets `verification_complete: true`. The early return ensures line 74 is never reached if `!allDone`. **This is NOT a bug in the implementation, but the comment in the audit was misleading.** 

Upon re-inspection: **THIS CODE IS CORRECT.** The early return on line 61 ensures the User update on line 74 never executes if tasks are incomplete. No issue here.

**REVISED VERDICT:** Not a bug. **DOWNGRADE TO MARKED AS REVIEWED (NOT AN ISSUE).**

---

## MEDIUM SEVERITY ISSUES

### **Issue #M1: No Timeout or Error State for DocuPass Overlay**

**Severity:** MEDIUM  
**Category:** UX Gap / Error Handling  
**Location:** `SubTaskIdentity.jsx`, lines 160–162  
**Evidence:**

```javascript
{showOverlay && docupassUrl && (
  <DocupassOverlay url={docupassUrl} onClose={handleCloseOverlay} />
)}
```

**Root Cause:**  
If the iframe loads a blank page (IDAnalyzer server down, network timeout), no error is shown. User sees a blank iframe indefinitely.

**Test Case:** Desktop user → clicks "Start Verification" → iframe loads → IDAnalyzer API down → blank iframe for 5 minutes.

**Impact:**  
User uncertainty; may close and retry, creating duplicate sessions.

**Fix Required:**
Add 60-second timeout + error fallback to DocupassOverlay component.

---

### **Issue #M2: Polling Progress Not Visible to User**

**Severity:** MEDIUM  
**Category:** UX Gap  
**Location:** `SubTaskIdentity.jsx`, lines 193–202  
**Evidence:**

```javascript
{polling && (
  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
    <Clock className="w-4 h-4 text-amber-600 animate-pulse flex-shrink-0" />
    <div className="flex-1">
      <p className="text-xs text-amber-700 font-medium">Under Review</p>
      <p className="text-[10px] text-amber-600">We're verifying your identity. This usually takes a few minutes.</p>
    </div>
  </div>
)}
```

**Root Cause:**  
Banner says "Under Review" but provides zero progress information. `pollAttempts` state is tracked (line 23) but never displayed.

**Impact:**  
User has no sense of progress. "A few minutes" is vague (actual max = 5 minutes, but could take 30s–60s).

**Fix Required:**
Display attempt count:
```javascript
<p className="text-[10px] text-amber-600">Attempt {pollAttempts}/60 — usually completes in 30–60 seconds.</p>
```

---

### **Issue #M3: Identity Status State Machine Ambiguity**

**Severity:** MEDIUM  
**Category:** Logic Error / State Management  
**Location:** `lib/verification.js`, lines 25–29  
**Evidence:**

```javascript
const identityStatus = allThreeApproved ? 'verified'
  : anyIdRejected ? 'rejected'
  : allThreeProcessed ? 'submitted'
  : (user?.docupass_attempt_count > 0) ? 'processing'
  : 'not_started';
```

**Root Cause:**  
State machine is clear: if 3 docs uploaded but not approved → 'submitted'. If attempt count > 0 → 'processing'. But what if BOTH are true? Example:
- User uploads 3 docs (pending)
- Webhook returns 'review' (under-review state, neither approved nor rejected)
- KycDocuments now have `status='pending'` + `provider_reference` set
- `allThreeProcessed = true`, so status → 'submitted'
- BUT `docupass_attempt_count = 1`, so ALSO matches 'processing' condition
- Precedence: 'submitted' wins

The state machine is actually **correct in precedence**, but naming is confusing. 'processing' implies "in-flight verification" but is triggered by attempt count alone, even if docs show 'submitted'. **No actual bug, but naming is misleading.**

**Fix:** Rename 'processing' to 'awaiting_review' or 'under_review' for clarity.

---

### **Issue #M4: Wallet Tier Upgrade Not Validated**

**Severity:** MEDIUM  
**Category:** Data Integrity  
**Location:** `idAnalyzerCallback`, lines 342–345  
**Evidence:**

```javascript
// Wallet tier upgrade & AuditLog (SYNCHRONOUS before returning 200)
if (decision === 'accept') {
  await upgradeWalletTier(base44, userId);  // ← No error checking on result
}
```

**Root Cause:**  
`upgradeWalletTier()` (lines 370–383) catches all errors silently:
```javascript
async function upgradeWalletTier(base44, userId) {
  try {
    // ... update wallet
  } catch (e) {
    console.warn('[idAnalyzerCallback] Wallet upgrade failed:', e.message);
  }
}
```

If wallet update fails, user is marked `kyc_status='verified'` but `wallet.tier` stays 0. Downstream transactions that check `wallet.tier >= 2` will fail.

**Test Case:**
1. IDAnalyzer approves user
2. Wallet database is temporarily unavailable
3. Wallet upgrade silently fails, logged as warning only
4. User sees "Tier 2 Unlocked" banner but cannot send money

**Impact:**  
User confusion + silent feature degradation.

**Fix Required:**
Log the failure more prominently; don't silently ignore:
```javascript
if (decision === 'accept') {
  const tierUpgradeResult = await upgradeWalletTier(base44, userId);
  if (!tierUpgradeResult.success) {
    console.error('[idAnalyzerCallback] Wallet tier upgrade FAILED — KYC approved but wallet not upgraded');
    // AuditLog this failure
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: userId,
      action: 'wallet_tier_upgrade_failed',
      description: `Wallet tier upgrade failed during KYC approval: ${tierUpgradeResult.error}`,
    });
  }
}
```

---

### **Issue #M5: Face Confidence Threshold Too Strict**

**Severity:** MEDIUM  
**Category:** Logic Error / Policy  
**Location:** `idAnalyzerCallback`, line 181  
**Evidence:**

```javascript
const faceIsIdentical = faceConfidence != null ? faceConfidence >= 0.7 : null;
```

**Root Cause:**  
Hard threshold of 0.7 (70%). If face confidence is 0.69, marked as "not identical". No tiering:
- 0.9–1.0 = auto-accept
- 0.7–0.9 = manual review flag
- <0.7 = reject

Current code treats 0.69 and 0.2 identically (both `faceIsIdentical = false`).

**Impact:**  
Marginal cases (0.65–0.75) rejected without admin review option. Users with glasses, lighting variations may fail unfairly.

**Fix Required:**
Implement tiered thresholds:
```javascript
let faceApprovalTier = 'unknown';
if (faceConfidence >= 0.9) faceApprovalTier = 'auto_accept';
else if (faceConfidence >= 0.7) faceApprovalTier = 'manual_review';
else if (faceConfidence != null) faceApprovalTier = 'reject';

userUpdate.id_face_approval_tier = faceApprovalTier;
```

---

### **Issue #M6: Empty String File URLs Create Data Ambiguity**

**Severity:** MEDIUM  
**Category:** Data Integrity  
**Location:** `idAnalyzerCallback`, line 261; `KycDocument.json` schema  
**Evidence:**

```javascript
// idAnalyzerCallback line 261
const recordData = { ...upsertData, file_url: url || existing?.file_url || '' };
```

```javascript
// KycDocument.json
'file_url': {'type': 'string'}  // ← Required, no allowNull
```

**Root Cause:**  
If IDAnalyzer doesn't return outputImage URLs (disabled in KYC profile), `url = ''` (empty string). Empty string satisfies `type: 'string'` but creates ambiguity: is `''` a missing file, a deleted file, or intentionally empty?

**Test Case:**
1. KYC profile doesn't have "Return Output Image" enabled
2. `frontUrl = backUrl = faceUrl = ''`
3. Code falls back to `existing?.file_url || ''`
4. KycDocument stored with `file_url: ''`
5. Admin queries: which KycDocuments have missing files? Can't distinguish.

**Impact:**  
Admin reports unclear; audit trails ambiguous.

**Fix Required:**
Change schema to allow null:
```javascript
'file_url': {'type': ['string', 'null']}  // ← Allow null for missing
```

Then code:
```javascript
const recordData = { ...upsertData, file_url: url || existing?.file_url || null };
```

---

## LOW SEVERITY ISSUES

### **Issue #L1: Polling maxAttempts Hardcoded**

**Severity:** LOW  
**Category:** Config / Testability  
**Location:** `SubTaskIdentity.jsx`, line 61  
**Evidence:**

```javascript
const maxAttempts = 60; // 5 minutes (3s initial + 60x5s polling)
```

**Root Cause:**  
Value is hardcoded. Makes QA/testing slow (60 × 5s = 5 minutes).

**Fix:** Move to constant or env variable for testability.

---

### **Issue #L2: Audit Log Missing Extracted Data Snapshot**

**Severity:** LOW  
**Category:** Logging Gap  
**Location:** `idAnalyzerCallback`, lines 346–352  
**Evidence:**

```javascript
await base44.asServiceRole.entities.AuditLog.create({
  user_id: userId,
  action: 'idanalyzer_docupass_completed',
  entity_type: 'KycDocument',
  description: `DocuPass ${decision}. Tx: ${transactionId}. Face: ${faceConfidence}, Auth: ${authScore}. Report: ${auditReportUrl ? 'stored' : 'none'}`,
  new_values: { decision, transactionId, faceConfidence, auditReportUrl },
  // ← Missing full extractedData
});
```

**Root Cause:**  
AuditLog records decision + confidence but NOT the full extracted fields. If admin needs to troubleshoot why a user was approved/rejected, must re-fetch User entity.

**Fix:**
```javascript
new_values: { decision, transactionId, ...extractedData },
```

---

### **Issue #L3: DocuPass Webhook Secret Declared But Unused**

**Severity:** LOW  
**Category:** Config / Dead Code  
**Location:** `IDANALYZER_WEBHOOK_SECRET` environment variable  
**Evidence:**

From existing secrets list: `IDANALYZER_WEBHOOK_SECRET` is set but never read in `idAnalyzerCallback`.

**Root Cause:**  
Callback uses API re-fetch for auth instead of HMAC. Secret is dead code.

**Fix:**
Document the decision in a comment:
```javascript
// Note: HMAC signature verification intentionally skipped
// Reason: Base44 modifies request body in transit, invalidating HMAC
// Auth instead uses IDAnalyzer API re-fetch + service role
```

Or remove the secret from environment if it's unused elsewhere.

---

## SUMMARY TABLE

| Issue ID | Severity | Category | Status | Fix Effort |
|----------|----------|----------|--------|------------|
| C1 | CRITICAL | Logic Error | Identified | 5 min |
| C2 | CRITICAL | Missing File | Identified | 10 min |
| C3 | CRITICAL | Security | Identified | 10 min |
| H1 | HIGH | Race Condition | Identified | 15 min |
| H2 | HIGH | Logic Error | Identified | 10 min |
| H3 | HIGH | Data Integrity | Identified | 20 min |
| H4 | HIGH | Logic Error | ✅ NOT AN ISSUE | — |
| M1 | MEDIUM | UX Gap | Identified | 20 min |
| M2 | MEDIUM | UX Gap | Identified | 5 min |
| M3 | MEDIUM | Logic Error | Identified | 5 min |
| M4 | MEDIUM | Data Integrity | Identified | 15 min |
| M5 | MEDIUM | Logic Error | Identified | 15 min |
| M6 | MEDIUM | Data Integrity | Identified | 10 min |
| L1 | LOW | Config | Identified | 5 min |
| L2 | LOW | Logging | Identified | 10 min |
| L3 | LOW | Config | Identified | 5 min |
| **TOTAL** | — | — | **15 Issues** | **155 min (~2.5 hrs)** |

---

## NEXT PHASE: FIX APPLICATION

Fixes will be applied in priority order (CRITICAL → HIGH → MEDIUM → LOW), with re-verification after each batch.
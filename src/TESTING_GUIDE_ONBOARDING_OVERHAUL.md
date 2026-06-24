# BodaSure Onboarding Overhaul - Testing Guide

## Overview
Testing the new simplified onboarding flow where wallet activation is merged into Phase 0 (Details → OTP → PIN).

---

## TEST SCENARIO 1: Fresh User Registration (Happy Path)

### Setup:
1. Delete test user if exists: `rodgerndungu@gmail.com`
2. Go to app dashboard, click "Register"

### Test Steps:
1. **Register new user**
   - Email: `rodgerndungu@gmail.com`
   - Password: Any strong password
   - Confirm password
   - Click "Register"
   - OTP will be sent to email
   - Verify OTP
   - User lands on `/app/profile` (Phase 0)

2. **Fill Phase 0 (Details)**
   - First Name: `Rodger`
   - Middle Name: (optional)
   - Last Name: `Ndungu`
   - Phone: `0712345678` or `0712000000` (valid Kenyan)
   - National ID: `12345678` (8 digits)
   - County: Select any county
   - Click "Next"

3. **Phase 0 Sub-step 1 (Wallet Activation - OTP)**
   - Should see "Step 1 of 4: Verify OTP"
   - Message: "An OTP has been sent to your phone"
   - ✅ Check: Resend OTP button appears
   - For sandbox testing, use OTP from SasaPay sandbox (or check logs)
   - Enter OTP
   - Click "Verify"

4. **Phase 0 Sub-step 2 (Set PIN)**
   - Should see "Step 2 of 4: Set PIN"
   - Enter 4-digit PIN (e.g., `1234`)
   - Confirm PIN (enter same `1234`)
   - Click "Set PIN"

5. **Phase 0 Completion**
   - Should see "Step 3 of 4: Done" with checkmark
   - Message: "Wallet Activated! Your BodaSure Wallet is now ready..."
   - Click "Continue to Bike Registration"
   - Auto-advances to Phase 1 (Bike Registration)

6. **Verify Phase 0 is Locked**
   - In ProgressBar, Phase 0 should show green checkmark
   - Try clicking Phase 0 in the progress bar: should NOT open
   - Phase 0 text should be grayed out

### Expected Results:
- ✅ User profile saved (name, phone, national_id, county)
- ✅ Wallet created with status='active', tier=1
- ✅ Phase 0 marked as complete
- ✅ User can access Phase 1 and beyond
- ✅ No `/app/wallet/activate` page should exist (redirects to `/app/profile`)

---

## TEST SCENARIO 2: Duplicate Phone Number

### Setup:
1. Create User A with phone `0712111111`
2. Start registration for User B

### Test Steps:
1. Register User B with same email as A (different user)
2. Go to Phase 0, fill form
3. **Fill Phone field: `0712111111`** (same as User A)
4. Tab out or click outside phone field
5. Error should appear: "This phone number is already in use. Please try a different one."
6. ✅ Phone field should remain editable
7. Change phone to `0712222222`
8. Error clears
9. Continue with wallet activation

### Expected Results:
- ✅ Prevents users from registering with duplicate phone
- ✅ Error message doesn't expose "BodaSure Wallet" (generic)
- ✅ User can immediately correct and retry
- ✅ Form not submitted until conflict resolved

---

## TEST SCENARIO 3: Duplicate National ID

### Setup:
1. Create User A with National ID `12345678`
2. Start registration for User B

### Test Steps:
1. Register User B (different email)
2. Go to Phase 0
3. **Fill National ID: `12345678`** (same as User A)
4. Tab out
5. Error should appear: "This ID number is already in use. Please verify your details."
6. ✅ ID field should remain editable
7. Change to `87654321`
8. Error clears
9. Proceed with wallet activation

### Expected Results:
- ✅ Prevents duplicate National IDs
- ✅ Generic error message (no account enumeration)
- ✅ User can retry immediately

---

## TEST SCENARIO 4: Wallet Activation Failure

### Setup:
Use valid but intentionally problematic credentials

### Test Steps:
1. Register user
2. Go to Phase 0
3. Fill form with:
   - Phone: `0700000000` (check if SasaPay blocks this)
   - National ID: `00000000` (potentially invalid)
4. Click "Next"
5. ✅ Should see error: "We encountered an issue during wallet activation. Please try again."
6. **Do NOT have profile saved yet**
7. User can edit phone/ID and retry without re-entering all form fields

### Expected Results:
- ✅ Profile NOT saved if wallet activation fails
- ✅ All form fields remain editable for retry
- ✅ User doesn't have stale wallet state
- ✅ Can immediately retry with different credentials

---

## TEST SCENARIO 5: OTP Expiry & Resend

### Setup:
User at Phase 0, Step 1 (OTP verification)

### Test Steps:
1. Wallet activation initiated, OTP sent
2. **Wait 5-10 minutes** (if SasaPay OTP expires)
3. Try to enter expired OTP
4. Should get error: "Invalid OTP" or similar
5. Click "Didn't receive code? Resend OTP"
6. ✅ New OTP should be sent
7. Enter new OTP
8. Should proceed to PIN step

### Expected Results:
- ✅ Resend OTP button functional
- ✅ New OTP code works
- ✅ No session state corruption

---

## TEST SCENARIO 6: Account Recovery (Partial Completion)

### Setup:
User at Phase 0, Step 2 (PIN setup), accidentally closes browser

### Test Steps:
1. User goes back to `/app/profile`
2. Phase 0 is NOT complete (wallet is active but PIN not set)
3. ✅ Should see Phase 0 still as incomplete or in progress
4. Click Phase 0
5. Should start from where they left off (or from the beginning)
6. Fill form again
7. ✅ On "Next", should detect wallet is already active
8. Should show "recovered: true" flow
9. Skip OTP, go straight to PIN step
10. Set PIN
11. Complete

### Expected Results:
- ✅ User doesn't re-do OTP if wallet already exists
- ✅ Recovery flow works correctly
- ✅ Phase 0 only marks complete when wallet tier=1 AND PIN set

---

## TEST SCENARIO 7: Phase 0 Locking

### Setup:
User has completed Phase 0

### Test Steps:
1. Go to `/app/profile`
2. Look at progress bar
3. ✅ Phase 0 should show green checkmark
4. Try clicking the Phase 0 circle in progress bar
5. ✅ Should NOT respond (no click handler)
6. Try clicking the "Profile" label
7. ✅ Should NOT open Phase 0
8. Entire ProgressBar should be non-interactive

### Expected Results:
- ✅ Completed phases are truly locked
- ✅ Rider can't edit profile/wallet info from Phase 0 again
- ✅ Visual indicator (green tick, grayed text) confirms locked status

---

## TEST SCENARIO 8: Rate Limiting on Duplicate Checks

### Setup:
Any user in Phase 0

### Test Steps:
1. Fill phone field
2. **Rapidly tab/blur 10+ times** in quick succession
3. Should eventually see: "Too many checks. Please try again in a moment."
4. ✅ Form should NOT block (validation still works, but checks rate-limited)
5. Wait 60+ seconds
6. Try again: should work

### Expected Results:
- ✅ Rate limiting prevents enumeration attacks
- ✅ User doesn't see "too many requests" on first legitimate attempt
- ✅ Rate limit resets after ~1 minute

---

## TEST SCENARIO 9: Admin Onboarding Errors Tab

### Setup:
Create multiple failed onboarding attempts (use duplicate phone/ID)

### Test Steps:
1. Go to Admin → SasaPay
2. Look for new tab: **"Onboarding Errors"**
3. ✅ Tab should show list of failed attempts
4. Columns: Rider Name, Phone, National ID, Status, Timestamp
5. Status should show: "📱 Duplicate Phone" or "🆔 Duplicate ID"
6. Click expand arrow on a row
7. ✅ Should show detailed error JSON with error_code, error_message, conflict_type
8. Scroll down in expanded view
9. ✅ Should show: User ID, Error Code, Message

### Expected Results:
- ✅ Tab lists recent onboarding errors (last 50)
- ✅ Expandable rows show full details
- ✅ No "Retry" button (by design)
- ✅ Admin can use this to diagnose user issues

---

## TEST SCENARIO 10: Phase 5 (Verification) Wallet Task

### Setup:
User has completed Phase 0-4, now at Phase 5

### Test Steps:
1. Go to Phase 5 (Verification)
2. Look at task list
3. ✅ First task should be: "Activate BodaSure Wallet"
4. Status should be: ✅ **"Verified"** (green checkmark)
5. Try clicking wallet task
6. ✅ Should NOT open (completed tasks are non-clickable in Phase 5 VerificationMiniStepper)
7. Below wallet task, should see other tasks:
   - Identity Verification (Not Started)
   - Bike Photos (Not Started)
   - Phone OTP (Not Started or Verified)
   - Owner Verification (Not Started)

### Expected Results:
- ✅ Wallet appears as first verification task
- ✅ Always shows as "Verified" for users in Phase 5
- ✅ Wallet task is non-interactive
- ✅ Other tasks remain functional

---

## TEST SCENARIO 11: Delete & Re-Register User

### Setup:
User `rodgerndungu@gmail.com` with completed onboarding

### Test Steps:
1. Go to Base44 Dashboard → Users
2. Find user `rodgerndungu@gmail.com`
3. **Delete the user**
4. Go back to app
5. Click "Register" (or Log Out → Register)
6. Enter **same email**: `rodgerndungu@gmail.com`
7. ✅ Should allow new registration (no conflicts)
8. Register with **same phone** from original account
9. Go to Phase 0
10. Enter phone: `0712345678` (same as deleted user)
11. ✅ Phone check should pass (deleted user is gone from DB)
12. Complete wallet activation
13. ✅ New wallet created successfully

### Expected Results:
- ✅ Deleting user removes all their records
- ✅ Phone/ID no longer conflict
- ✅ Fresh onboarding works with same phone/ID
- ✅ New wallet created for re-registered user

---

## Performance Checks

### Check 1: Admin Onboarding Errors Tab Load Time
- Click "Onboarding Errors" tab
- Should load in <2 seconds (limited to 50 records)
- No UI freeze or lag

### Check 2: Duplicate Check Response Time
- Fill form fields
- Each blur/validation should respond in <500ms
- No noticeable delay

### Check 3: Database Queries
- Check admin logs for query performance
- Duplicate checks should use indexed queries
- Rate limiting uses in-memory Map (fast)

---

## Regression Testing (Existing Features)

### Check: Other Phases Still Work
1. Phase 1 (Bike) registration
2. Phase 2 (Map) county selection
3. Phase 3 (Stage) selection
4. Phase 4 (SACCO) membership
5. Phase 5 (Verification) KYC uploads
6. Phase 6 (Completion)

**All should work unchanged.**

### Check: Wallet Features
1. Wallet page shows Tier 1 after Phase 0
2. Deposit/Withdraw flows
3. PIN verification for transactions
4. Wallet transactions display correctly

**All should be unaffected.**

### Check: KYC Flow
1. IDAnalyzer DocuPass still works
2. Liveness check
3. KYC approval flow
4. Wallet tier upgrade to Tier 2

**All should be unaffected.**

---

## Summary Checklist

- [ ] Fresh registration → Phase 0 → Wallet activation → Phase 1
- [ ] Duplicate phone blocked (self-service error message)
- [ ] Duplicate national ID blocked (self-service error message)
- [ ] Wallet activation failure → profile NOT saved
- [ ] OTP resend works
- [ ] Partial completion → recovery skips OTP
- [ ] Phase 0 locked after completion (non-clickable)
- [ ] Rate limiting prevents enumeration attacks
- [ ] Admin Onboarding Errors tab functional
- [ ] Phase 5 shows wallet task as verified
- [ ] Delete & re-register with same phone works
- [ ] All existing features still work (regression)

---

## If Bugs Found

1. Document the exact steps to reproduce
2. Check the "BUGS FIXED" section below
3. If already listed, confirm fix is applied
4. If new bug, report with:
   - Test scenario #
   - Expected vs Actual behavior
   - Browser console errors (if any)
   - Backend logs (if relevant)

---

## BUGS FIXED IN THIS BUILD

1. ✅ **Icon Mismatch** - Added Wallet icon to TASK_ICONS array
2. ✅ **Missing React Imports** - Added useCallback, useState, useEffect, useRef to PhaseVerification
3. ✅ **Wallet Activation Timing** - Wallet init now called BEFORE profile save
4. ✅ **Resend OTP Missing** - Added resend button to Phase 0 OTP step
5. ✅ **Account Enumeration** - Error messages now generic (don't expose account existence)
6. ✅ **Rate Limiting** - Added 5 checks/minute limit per user on duplicate checks
7. ✅ **Admin Performance** - Limited AuditLog queries to last 50 records
8. ✅ **OTP State Cleanup** - Reset OTP field when moving to OTP step

---

## Support

If user gets stuck:
1. Admin can view Onboarding Errors tab for diagnostics
2. User can always retry with edited phone/ID
3. No "contact support" requirement for duplicate issues (self-service)
4. Backend properly logs all failures for troubleshooting
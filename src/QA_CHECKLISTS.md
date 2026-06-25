# BodaSure QA Checklists

> **Run these BEFORE and AFTER any major change session.**
> Each step has an expected outcome. Mark PASS or FAIL.
> If any step FAILS, stop and investigate before proceeding.

---

## 1. New User Onboarding (Phase 0 → Phase 6)

### Prerequisites
- New test user account (not yet onboarded)
- SasaPay sandbox environment active
- Valid Kenyan phone number that can receive OTP
- Valid National ID number (not already registered)

### Steps

| # | Action | Expected Outcome | Result |
|---|---|---|---|
| 1 | Log in as new user → land on Home | Wallet activation prompt shown (no wallet yet) | ☐ PASS ☐ FAIL |
| 2 | Click "Activate Now" → redirected to Profile | Onboarding Phase 0 (Personal Details) shown | ☐ PASS ☐ FAIL |
| 3 | Enter First Name, Last Name | Fields accept text input | ☐ PASS ☐ FAIL |
| 4 | Enter a phone number that's already registered | On blur, red error: "This phone number is already in use" | ☐ PASS ☐ FAIL |
| 5 | Enter a valid new phone number | On blur, green checkmark: "Phone verified" | ☐ PASS ☐ FAIL |
| 6 | Enter a National ID already registered | On blur, red error: "This ID number is already in use" | ☐ PASS ☐ FAIL |
| 7 | Enter a valid new National ID (6-8 digits) | On blur, green checkmark: "ID verified" | ☐ PASS ☐ FAIL |
| 8 | Select a county from dropdown | County selected | ☐ PASS ☐ FAIL |
| 9 | Click "Activate Wallet" | Loading spinner → OTP step appears | ☐ PASS ☐ FAIL |
| 10 | Wait for OTP SMS on phone | OTP SMS received within 60 seconds | ☐ PASS ☐ FAIL |
| 11 | Enter wrong OTP → click Verify | Red error: "Verification failed. Check your code" | ☐ PASS ☐ FAIL |
| 12 | Tap Resend OTP → backend returns new requestId → new OTP SMS received → enter NEW OTP → Verify | requestId updated via onRequestIdUpdated callback; old OTP rejected; new OTP works | ☐ PASS ☐ FAIL |
| 13 | Enter correct OTP → click Verify | Success → PIN step appears | ☐ PASS ☐ FAIL |
| 14 | Enter 4-digit PIN, mismatch confirm | Red error: "PINs do not match" | ☐ PASS ☐ FAIL |
| 15 | Enter matching 4-digit PINs → click Set PIN | Success screen with green checkmark | ☐ PASS ☐ FAIL |
| 16 | Click "Continue to Bike Registration" | Phase 1 (Bike Registration) appears | ☐ PASS ☐ FAIL |
| 17 | Complete bike registration form | Bike details saved, proceed to Phase 2 | ☐ PASS ☐ FAIL |
| 18 | Complete map bike location | Sub-county, ward, stage selected, proceed to Phase 3 | ☐ PASS ☐ FAIL |
| 19 | Complete stage assignment | Stage confirmed, proceed to Phase 4 | ☐ PASS ☐ FAIL |
| 20 | Complete SACCO membership | SACCO joined (pending), proceed to Phase 5 | ☐ PASS ☐ FAIL |
| 21 | Complete KYC DocuPass scan | Identity documents processed, proceed to Phase 6 | ☐ PASS ☐ FAIL |
| 22 | Land on Completion Screen | "Account Configured" success message shown | ☐ PASS ☐ FAIL |
| 23 | Click "Go to Dashboard" | Home page loads with wallet active, all tiles visible | ☐ PASS ☐ FAIL |
| 24 | Check Home greeting shows user-entered name | Greeting uses the name entered in Step 3 (not OAuth name) | ☐ PASS ☐ FAIL |

---

## 2. Duplicate Registration Blocking

### Steps

| # | Action | Expected Outcome | Result |
|---|---|---|---|
| 1 | Attempt to register with a phone number that already has a wallet | Hard-block: "This phone number is already registered with BodaSure Wallet" | ☐ PASS ☐ FAIL |
| 2 | Attempt to register with a National ID already in the system | Hard-block: "This ID number is already in use" | ☐ PASS ☐ FAIL |
| 3 | Check Admin → SasaPay → Onboarding Errors tab | The failed attempt from Step 1 or 2 appears in the log | ☐ PASS ☐ FAIL |
| 4 | Attempt SasaPay init with phone that has existing SasaPay wallet | Hard-block: "This phone number is already registered with BodaSure Wallet" | ☐ PASS ☐ FAIL |
| 5 | Verify NO recovery/relinking option is offered | No "recover account" or "relink" button appears anywhere | ☐ PASS ☐ FAIL |

---

## 3. Payments Flow (STK Push → Webhook → Settlement)

### Steps

| # | Action | Expected Outcome | Result |
|---|---|---|---|
| 1 | Navigate to Lipisha (Collect Fare) | Fare collection screen loads | ☐ PASS ☐ FAIL |
| 2 | Enter amount and customer phone number | Input accepted, validation passes | ☐ PASS ☐ FAIL |
| 3 | Click "Send STK Push" | Loading → STK push sent to customer's phone | ☐ PASS ☐ FAIL |
| 4 | Check Transaction entity | New Transaction created with status: 'initiated', type: 'lipisha' | ☐ PASS ☐ FAIL |
| 5 | Customer receives M-Pesa prompt | STK prompt appears on customer's phone | ☐ PASS ☐ FAIL |
| 6 | Customer enters M-Pesa PIN | Payment processed by SasaPay | ☐ PASS ☐ FAIL |
| 7 | SasaPay webhook received | `sasapayWebhook` function triggered | ☐ PASS ☐ FAIL |
| 8 | HMAC verification passes | Webhook payload accepted (not rejected) | ☐ PASS ☐ FAIL |
| 9 | Transaction status updated | Transaction.status → 'completed' | ☐ PASS ☐ FAIL |
| 10 | Wallet balance updated | WalletSnapshot reflects new balance | ☐ PASS ☐ FAIL |
| 11 | Settlement created | TransactionLeg entries created for county/sacco/platform splits | ☐ PASS ☐ FAIL |
| 12 | SMS confirmation sent | SmsLog entry created with status 'sent' or 'queued' | ☐ PASS ☐ FAIL |
| 13 | Home page balance reflects new amount | Balance updates (may need refresh) | ☐ PASS ☐ FAIL |

---

## 4. KYC Verification (DocuPass)

### Steps

| # | Action | Expected Outcome | Result |
|---|---|---|---|
| 1 | Navigate to Profile → Phase 5 (Verification) | Verification task list shown | ☐ PASS ☐ FAIL |
| 2 | Click "Start Identity Verification" | DocuPass iframe loads | ☐ PASS ☐ FAIL |
| 3 | Complete ID front scan | Document uploaded, processing | ☐ PASS ☐ FAIL |
| 4 | Complete ID back scan | Document uploaded, processing | ☐ PASS ☐ FAIL |
| 5 | Complete selfie scan | Document uploaded, processing | ☐ PASS ☐ FAIL |
| 6 | Wait for IDAnalyzer callback | Callback received within 2 minutes | ☐ PASS ☐ FAIL |
| 7 | Check KycDocument statuses | All three documents show 'approved' (or 'rejected') | ☐ PASS ☐ FAIL |
| 8 | If all approved | user.kyc_status → 'verified', user.verification_complete → true | ☐ PASS ☐ FAIL |
| 9 | If any rejected | Rejection reason shown, user can retry | ☐ PASS ☐ FAIL |
| 10 | Check DocuPass result screen | Shows accepted/review/rejected outcome correctly | ☐ PASS ☐ FAIL |
| 11 | Verify idempotency: replay webhook | No duplicate processing — existing status unchanged | ☐ PASS ☐ FAIL |

---

## 5. SMS / OTP Delivery

### Steps

| # | Action | Expected Outcome | Result |
|---|---|---|---|
| 1 | Trigger an OTP send (e.g., wallet activation) | OTP SMS sent via Africa's Talking | ☐ PASS ☐ FAIL |
| 2 | Check SmsLog entry | Created with status 'queued' or 'sent', at_message_id set | ☐ PASS ☐ FAIL |
| 3 | Wait for delivery callback | `smsDeliveryCallback` function triggered | ☐ PASS ☐ FAIL |
| 4 | SmsLog status updated | status → 'delivered' or 'failed' | ☐ PASS ☐ FAIL |
| 5 | Verify phone format in SmsLog | recipient_phone is E.164 (+254XXXXXXXXX) | ☐ PASS ☐ FAIL |
| 6 | Test bulk SMS campaign | Campaign created, recipients counted, messages sent in batches | ☐ PASS ☐ FAIL |
| 7 | Check campaign progress | sent_count and batches_processed update in real-time | ☐ PASS ☐ FAIL |
| 8 | Verify sender ID | SMS shows "BodaSure" as sender (sandbox) | ☐ PASS ☐ FAIL |

---

## 6. Admin Dashboard

### Steps

| # | Action | Expected Outcome | Result |
|---|---|---|---|
| 1 | Log in as super_admin → navigate to Admin Overview | Dashboard loads with summary stats | ☐ PASS ☐ FAIL |
| 2 | Navigate to Admin → SasaPay | SasaPay module loads with tabs (Accounts, Onboarding Errors, etc.) | ☐ PASS ☐ FAIL |
| 3 | Check Onboarding Errors tab | Failed onboarding attempts visible with error details | ☐ PASS ☐ FAIL |
| 4 | Navigate to Admin → KYC | KYC submissions list loads, reviewable | ☐ PASS ☐ FAIL |
| 5 | Navigate to Admin → Flags | Flags panel shows location/ANPR issues | ☐ PASS ☐ FAIL |
| 6 | Navigate to Admin → Users | User list loads, can view/edit users | ☐ PASS ☐ FAIL |
| 7 | Navigate to Admin → Communications | Comms module loads with Templates, Bulk, Logs tabs | ☐ PASS ☐ FAIL |
| 8 | Navigate to Admin → Audit Log | Audit log entries visible, filterable | ☐ PASS ☐ FAIL |

---

## 7. Wallet PIN Security

### Steps

| # | Action | Expected Outcome | Result |
|---|---|---|---|
| 1 | Set wallet PIN during onboarding | PIN stored (hashed), wallet activated | ☐ PASS ☐ FAIL |
| 2 | Attempt transaction with correct PIN | Transaction proceeds | ☐ PASS ☐ FAIL |
| 3 | Attempt transaction with wrong PIN | Rejected, pin_attempts incremented | ☐ PASS ☐ FAIL |
| 4 | Enter wrong PIN 3+ times | Account locked (pin_locked_until set) | ☐ PASS ☐ FAIL |
| 5 | Attempt transaction while locked | Blocked with "wallet locked" message | ☐ PASS ☐ FAIL |

---

## 8. Read-Only Completed Phases

### Steps

| # | Action | Expected Outcome | Result |
|---|---|---|---|
| 1 | As an onboarded user, navigate to Profile | Profile summary card shown (not editing form) | ☐ PASS ☐ FAIL |
| 2 | Click "View" on a completed phase | Phase renders in read-only mode (grayed-out) | ☐ PASS ☐ FAIL |
| 3 | Try to interact with form fields | Fields are non-interactive (pointer-events: none) | ☐ PASS ☐ FAIL |
| 4 | Read-only banner visible | "This step is completed" banner with lock icon | ☐ PASS ☐ FAIL |
| 5 | Click back button | Returns to profile summary or previous step | ☐ PASS ☐ FAIL |

---

## 9. Portal Access Control

### Steps

| # | Action | Expected Outcome | Result |
|---|---|---|---|
| 1 | Log in as regular rider → try to access /admin/overview | Redirected or access denied | ☐ PASS ☐ FAIL |
| 2 | Log in as county_admin → access /county/dashboard | County dashboard loads | ☐ PASS ☐ FAIL |
| 3 | Log in as county_admin → try /sacco/dashboard | Access denied (wrong role) | ☐ PASS ☐ FAIL |
| 4 | Log in as sacco_admin → access /sacco/dashboard | SACCO dashboard loads | ☐ PASS ☐ FAIL |
| 5 | Log in as super_admin → access /admin/overview | Admin dashboard loads | ☐ PASS ☐ FAIL |
| 6 | Log out → try to access /app | Redirected to /login | ☐ PASS ☐ FAIL |

---

## 10. Name Persistence (Regression Test)

### Steps

| # | Action | Expected Outcome | Result |
|---|---|---|---|
| 1 | Complete onboarding with user-entered name "Robert Maina" | Name saved to User entity | ☐ PASS ☐ FAIL |
| 2 | Refresh the page | Home greeting shows "Robert" (not OAuth name) | ☐ PASS ☐ FAIL |
| 3 | Navigate to Profile | Profile shows "Robert Maina" | ☐ PASS ☐ FAIL |
| 4 | Log out and log back in | Name persists as "Robert Maina" | ☐ PASS ☐ FAIL |
| 5 | Check Admin → Users | User record shows "Robert Maina" | ☐ PASS ☐ FAIL |
| 6 | Trigger an OAuth token refresh (wait or re-auth) | Name still shows "Robert Maina" (not reverted) | ☐ PASS ☐ FAIL |

---

## Running These Checklists

1. **Before changes**: Run the checklist(s) relevant to the area you're about to modify. Confirm all PASS.
2. **After changes**: Run the same checklist(s). Confirm all still PASS. Any new FAIL = regression.
3. **Log results**: Note the date, what changed, and which tests passed/failed.

### If a test FAILS:
1. Do NOT proceed with more changes.
2. Identify which file/function governs the failing behavior (check ARCHITECTURE.md).
3. Read the relevant FEATURE_CONTRACTS.md entry to understand the expected payload/behavior.
4. Fix the root cause, not the symptom.
5. Re-run the full checklist.
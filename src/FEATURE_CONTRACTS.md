# BodaSure Feature Contracts

> **AI WORKFLOW RULE**: Read this before any code change. These are locked cross-file dependencies.
> If you change a CALLEE, update ALL its CALLERS listed here.
> Last updated: 2026-06-25

---

## Format

Each contract is written as:
```
CALLER → CALLEE
  Payload shape: { ... }
  MUST NOT CHANGE: description of what must stay stable
```

---

## SasaPay Personal Onboarding

### PhasePersonal → sasapayPersonalOnboarding (init)
```
PhasePersonal.handleInitWallet() → base44.functions.invoke('sasapayPersonalOnboarding', { action: 'init' })
  Payload: { action: 'init' }
  Reads user fields from auth context: full_name, phone, national_id, county_id, middle_name
  MUST NOT CHANGE: action must be 'init'. User must have full_name, phone, national_id set before calling.
  Response expected: { success: boolean, requestId?: string, error?: string, conflictType?: string }
```

### PhasePersonal → sasapayPersonalOnboarding (confirm)
```
PhasePersonal.handleConfirmOtp() → base44.functions.invoke('sasapayPersonalOnboarding', { action: 'confirm', otp, requestId })
  Payload: { action: 'confirm', otp: string, requestId: string }
  MUST NOT CHANGE: action must be 'confirm'. otp and requestId are required.
  Response expected: { success: boolean, accountNumber?: string, displayName?: string, accountStatus?: string, error?: string }
```

### PhasePersonal → sasapayPersonalOnboarding (resendOtp)
```
PhasePersonal (resend button) → base44.functions.invoke('sasapayPersonalOnboarding', { action: 'resendOtp', requestId })
  Payload: { action: 'resendOtp', requestId: string }
  MUST NOT CHANGE: action must be 'resendOtp'. Backend re-calls init with same user data to generate new OTP.
  Response expected: { success: boolean, requestId?: string, error?: string }
```

### sasapayPersonalOnboarding → Wallet entity
```
sasapayPersonalOnboarding (init) → base44.asServiceRole.entities.Wallet.update(walletId, { sasapay_request_id })
sasapayPersonalOnboarding (confirm) → base44.asServiceRole.entities.Wallet.update/create(...)
  Fields written: sasapay_request_id, sasapay_customer_id, sasapay_account_number, sasapay_account_status, tier, status
  MUST NOT CHANGE: sasapay_account_status enum: ['ACTIVE', 'AWAITING_KYC_UPLOAD', 'PENDING', 'REJECTED']
                  account_number must be coerced to STRING (SasaPay returns integer)
                  tier set to 1 on confirm, status set to 'active'
```

### sasapayPersonalOnboarding → User entity (name lock-in)
```
sasapayPersonalOnboarding (confirm) → base44.asServiceRole.entities.User.update(userId, { full_name, middle_name })
  MUST NOT CHANGE: This is a FORCED service-role write to prevent OAuth refresh from clobbering user-entered names.
                  full_name and middle_name are read from the authenticated user's current state.
```

### PhasePersonal → setWalletPin
```
PhasePersonal.handleSetPin() → base44.functions.invoke('setWalletPin', { pin })
  Payload: { pin: string } (4 digits)
  MUST NOT CHANGE: pin must be 4-digit string. Function auto-looks up walletId by authenticated user.
  Response expected: { success: boolean, error?: string }
```

### PhasePersonal → checkPhoneUniqueness
```
PhasePersonal.checkPhoneUniqueness() → base44.functions.invoke('checkPhoneUniqueness', { phone })
  Payload: { phone: string } (E.164 format: 254XXXXXXXXX)
  MUST NOT CHANGE: phone must be normalized before calling. Returns 429 on rate limit (don't block form).
  Response expected: { conflict: boolean } or HTTP 429
```

### PhasePersonal → checkNationalIdUniqueness
```
PhasePersonal.checkIdUniqueness() → base44.functions.invoke('checkNationalIdUniqueness', { national_id })
  Payload: { national_id: string } (6-8 digits)
  MUST NOT CHANGE: national_id must be digits only. Returns 429 on rate limit (don't block form).
  Response expected: { conflict: boolean } or HTTP 429
```

### PhasePersonal → base44.auth.updateMe (profile save)
```
PhasePersonal.handleInitWallet() → base44.auth.updateMe({ full_name, phone, national_id, county_id, middle_name })
  MUST NOT CHANGE: These fields are saved BEFORE wallet activation. If wallet init fails, profile persists.
                  After updateMe, refreshUser() is called to sync auth context.
```

---

## SasaPay Payments

### sasapayStkPush → Transaction entity
```
sasapayStkPush → base44.entities.Transaction.create(...)
  Fields: wallet_id, type: 'deposit'|'lipisha'|..., amount_cents, status: 'initiated', reference, checkout_request_id
  MUST NOT CHANGE: Transaction type enum must match: deposit/withdraw/send/lipisha/lipa_county/lipa_owner/chama/insurance/utility/penalty
```

### sasapayWebhook → Transaction entity
```
sasapayWebhook → base44.asServiceRole.entities.Transaction.filter({ checkout_request_id }) → update(...)
  MUST NOT CHANGE: Webhook finds transaction by checkout_request_id, updates status to 'completed'.
                  HMAC-SHA512 verification using SASAPAY_CLIENT_ID before any processing.
```

### sasapayWebhook → WalletSnapshot entity
```
sasapayWebhook → base44.asServiceRole.entities.WalletSnapshot.create(...)
  Fields: wallet_id, balance_cents
  MUST NOT CHANGE: balance_cents must be integer (cents, not KES).
```

---

## KYC / Identity Verification

### PhaseVerification → createDocupassSession
```
PhaseVerification → base44.functions.invoke('createDocupassSession', { ... })
  MUST NOT CHANGE: Returns DocuPass URL for iframe embedding. User completes scan in iframe.
```

### idAnalyzerCallback → KycDocument entity
```
idAnalyzerCallback → base44.asServiceRole.entities.KycDocument.filter({ provider_reference }) → update(...)
  MUST NOT CHANGE: Callback is idempotent — keyed off transactionId + decision status.
                  KycDocument.provider_reference must be set (only IDAnalyzer-processed docs have this).
                  On API re-fetch failure, return HTTP 500 to trigger IDAnalyzer retry.
```

### idAnalyzerCallback → User entity
```
idAnalyzerCallback → base44.asServiceRole.entities.User.update(userId, { kyc_status, verification_complete })
  MUST NOT CHANGE: kyc_status set to 'verified' when all 3 ID docs approved.
                  verification_complete set to true when all verification tasks pass.
```

### PhaseVerification → completeVerification
```
PhaseVerification → base44.functions.invoke('completeVerification', { ... })
  MUST NOT CHANGE: Sets user.verification_complete = true. Home.jsx and KycTierStatus read this flag.
```

---

## Onboarding Flow

### Profile → getOnboardingPhase
```
Profile.jsx → getOnboardingPhase(user, vehicles, groupMembers, wallet)
  Returns: 0-6 (phase number)
  MUST NOT CHANGE: Arguments order and types. Logic in lib/onboarding.js.
                  Phase 0: profile + wallet not complete
                  Phase 1: no vehicle
                  Phase 2: vehicle not mapped to location
                  Phase 3: no stage assigned
                  Phase 4: no SACCO membership
                  Phase 5: KYC not complete
                  Phase 6: all complete
```

### Profile → PhasePersonal (props)
```
Profile.jsx → <PhasePersonal
  user={user}                    // auth context user
  counties={counties}            // County entity list
  initialValues={...}            // draft data from user + previous input
  onDraftChange={(partial) =>}   // called on every form change
  onSaved={handlePhaseComplete}  // called when phase 0 is done
  onBack={() => navigate('/app')}
  readOnly={boolean}             // true if phase already completed
  onExitReadOnly={handleExitReadOnly}
/>
  MUST NOT CHANGE: Props interface. PhasePersonal is now a thin orchestrator — step state lives here.
```

### Home.jsx → wallet/verification flags
```
Home.jsx reads:
  - user.onboarding_complete (boolean) — set by completeOnboarding function
  - user.verification_complete (boolean) — set by completeVerification function
  - user.kyc_status ('verified'|other) — set by idAnalyzerCallback
  - wallet.status ('active'|'inactive'|'pending_kyc')
  - wallet.tier (0 = not activated, 1+ = activated)
  MUST NOT CHANGE: Home shows wallet activation gate when wallet.status !== 'active' || wallet.tier === 0.
                   Home shows verification nudge when onboarding_complete && !verification_complete.
```

### KycTierStatus → user + kycDocs
```
KycTierStatus reads:
  - user.kyc_status
  - kycDocs (KycDocument[] filtered by user_id)
  - vehicle (Vehicle | undefined)
  - groupMember (GroupMember | undefined)
  MUST NOT CHANGE: getKycLevel(user) in KycLevelBadge returns 0, 1, or 2 based on kyc_status.
                   Tier 2 unlocks: LipaOwner, Chama, Insurance.
```

---

## SMS / Communications

### sendOtp → SmsLog entity
```
sendOtp → base44.asServiceRole.entities.SmsLog.create(...)
  Fields: recipient_phone (E.164), message_body, template_key, event_type: 'otp', status: 'queued'|'sent'|'failed', at_message_id
  MUST NOT CHANGE: recipient_phone must be +254XXXXXXXXX before Africa's Talking API call.
```

### smsDeliveryCallback → SmsLog entity
```
smsDeliveryCallback → base44.asServiceRole.entities.SmsLog.filter({ at_message_id }) → update(...)
  MUST NOT CHANGE: Updates status to 'delivered' or 'failed' based on AT callback.
                  Callback has no auth — validated by at_message_id lookup.
```

### createSmsCampaign → SmsCampaign entity
```
createSmsCampaign → base44.asServiceRole.entities.SmsCampaign.create(...)
  Fields: name, message_body, audience_type, audience_filter_id, county_scope_id, status: 'queued', total_recipients
  MUST NOT CHANGE: audience_type enum: all_riders/by_county/by_sacco/by_stage/by_sub_county/by_ward/individual
```

### sendBulkSms → SmsCampaign + SmsLog entities
```
sendBulkSms → reads SmsCampaign, writes SmsLog, updates SmsCampaign (sent_count, failed_count, batches_processed)
  MUST NOT CHANGE: Processes in batches. Updates campaign progress in real-time.
```

---

## Bike Registration

### PhaseBike → Vehicle entity
```
PhaseBike → base44.entities.Vehicle.create/update(...)
  Fields: plate_number, make, model, color, owner_id, rider_id, county_id, is_owner_rider, owner_phone, owner_name
  MUST NOT CHANGE: plate_number must be validated via verifyPlateRecognizer before saving.
                  is_owner_rider determines whether owner_phone verification is needed.
```

### PhaseBike → verifyPlateRecognizer
```
PhaseBike → base44.functions.invoke('verifyPlateRecognizer', { plate_image })
  MUST NOT CHANGE: PLATERECOGNIZER_API_TOKEN used server-side. Returns extracted plate for validation.
```

### Home.jsx → Vehicle.filter (owner verification)
```
Home.jsx → base44.entities.Vehicle.filter({ owner_phone: user.phone, owner_verified: false })
  MUST NOT CHANGE: Shows "Verify Your Bike" section when bikes exist with user's phone as owner but not verified.
                  Confirm action: Vehicle.update(bike.id, { owner_verified: true })
```

---

## SACCO Application

### PhaseSacco → GroupMember entity
```
PhaseSacco → base44.entities.GroupMember.create(...)
  Fields: group_id, user_id, role: 'member', status: 'pending'
  MUST NOT CHANGE: status starts as 'pending'. SACCO admin approves → status: 'approved'.
```

### Home.jsx → pending SACCO banner
```
Home.jsx reads:
  - user.pending_group_id — if set, fetches Group and shows "Under Review" banner
  - user.group_rejection_reason — if set, shows "Application Rejected" banner
  MUST NOT CHANGE: These user fields drive the SACCO application status UI on Home.
```

---

## Staff Portal Access

### StaffLayout → requiredRole
```
StaffLayout accepts: accent, portalName, navItems, requiredRole
  requiredRole can be string or array of strings
  MUST NOT CHANGE: Role values: county_admin, sacco_admin, merchant_admin, field_agent, stage_admin, super_admin, bodasure_staff
                  ProtectedRoute checks user.role against requiredRole.
```

---

## Auth Context

### AuthContext → base44.auth
```
AuthContext.checkAppState() → checks app public settings + auth state
AuthContext.checkUserAuth() → base44.auth.me() → sets user state
AuthContext.refreshUser() → base44.auth.me() → updates user state (used after updateMe)
AuthContext.logout() → base44.auth.logout() → clears token, reloads
AuthContext.navigateToLogin() → base44.auth.redirectToLogin('/app')
  MUST NOT CHANGE: refreshUser() MUST be called after any base44.auth.updateMe() call in the rider app.
                  redirectToLogin destination is always '/app' (never current URL).
```

### ProtectedRoute
```
ProtectedRoute accepts: unauthenticatedElement, fallback
  Renders <Outlet /> when authenticated, unauthenticatedElement when not.
  MUST NOT CHANGE: Used as layout route wrapping all authenticated pages in App.jsx.
``
# BodaSure Architecture Reference

> **AI WORKFLOW RULE**: Read this file, DECISIONS.md, and FEATURE_CONTRACTS.md before writing any code.
> Last updated: 2026-06-25

---

## 1. System Overview

BodaSure is a fintech super-app for Kenyan bodaboda (motorcycle taxi) riders. It provides wallet management, fare collection, county permit payments, owner payments, SACCO/chama contributions, insurance, compliance, and KYC verification.

**Stack**: React 18 + Vite + Tailwind CSS + shadcn/ui on Base44 BaaS (auth, database, hosting, realtime, file storage, scheduled automations).

**Backend**: Deno deploy handlers in `functions/` — called via `base44.functions.invoke()` from frontend, or directly as webhook endpoints.

---

## 2. Entity Map (30+ entities)

### Core User & Wallet
| Entity | Purpose | Key Fields |
|---|---|---|
| **User** (built-in) | Auth + profile | `full_name`, `email`, `phone`, `national_id`, `county_id`, `middle_name`, `kyc_status`, `onboarding_complete`, `verification_complete`, `docupass_attempt_count`, `pending_group_id`, `group_rejection_reason` |
| **Wallet** | Personal/business wallet | `user_id`, `entity_type`, `account_number`, `tier`, `status`, `pin_hash`, `pin_attempts`, `pin_locked_until`, `sasapay_customer_id`, `sasapay_request_id`, `sasapay_account_number`, `sasapay_account_status`, `sasapay_kyc_uploaded_at`, `needs_review` |
| **WalletSnapshot** | Balance snapshots | `wallet_id`, `balance_cents` |
| **Transaction** | All financial transactions | `wallet_id`, `type` (deposit/withdraw/send/lipisha/lipa_county/lipa_owner/chama/insurance/utility/penalty), `amount_cents`, `status`, `reference`, `checkout_request_id`, `counterparty_wallet_id`, `counterparty_phone`, `vehicle_id`, `permit_id`, `sasapay_fee_kes`, `bodasure_fee_kes`, `total_fee_kes` |
| **TransactionLeg** | Split settlement legs | Links to Transaction for county/sacco/platform splits |

### Geography Hierarchy
| Entity | Purpose | Key Fields |
|---|---|---|
| **County** | 47 Kenyan counties | `name`, `code`, `status` (draft/live), `sasapay_account_number`, `sasapay_business_kyc_status` |
| **SubCounty** | Sub-county divisions | `name`, `county_id` |
| **Constituency** | Electoral constituencies | `name`, `county_id`, `sub_county_id` |
| **Ward** | Wards within sub-counties | `name`, `sub_county_id`, `constituency_id`, `county_id` |
| **Stage** | Bodaboda stages/stands | `name`, `ward_id`, `county_id`, `location_lat`, `location_lng`, `member_count`, `leader_id`, `application_status` |

### Vehicles & Ownership
| Entity | Purpose | Key Fields |
|---|---|---|
| **Vehicle** | Motorcycle registration | `plate_number`, `make`, `model`, `color`, `owner_id`, `rider_id`, `county_id`, `sub_county_id`, `ward_id`, `stage_id`, `status`, `bike_photo_url`, `rider_photo_url`, `logbook_url`, `owner_id_doc_url`, `is_owner_rider`, `owner_phone`, `owner_verified`, `owner_name`, `needs_review`, `location_flagged` |
| **Inspection** | Bike compliance inspections | `vehicle_id`, `rider_id`, `inspector_id`, `county_id`, `result`, `photo_url` |

### Groups & Memberships
| Entity | Purpose | Key Fields |
|---|---|---|
| **Group** | SACCOs, chamas, welfare groups | `name`, `type`, `county_id`, `sasapay_account_number`, `status`, `member_count`, `kyc_status`, `source`, `registration_number`, `kra_pin`, `directors[]`, `sasapay_request_id`, `sasapay_account_status` |
| **GroupMember** | User→Group membership | `group_id`, `user_id`, `role` (member/treasurer/chairperson/secretary), `status`, `joined_date` |

### KYC & Verification
| Entity | Purpose | Key Fields |
|---|---|---|
| **KycDocument** | Identity documents | `user_id`, `document_type` (id_front/id_back/selfie/logbook/owner_id/bike_front/bike_left/bike_rear/bike_right), `file_url`, `status`, `rejection_reason`, `reviewed_by_id`, `reviewed_at`, `provider_name`, `provider_reference` |

### Compliance
| Entity | Purpose | Key Fields |
|---|---|---|
| **Permit** | County operating permits | `vehicle_id`, `rider_id`, `county_id`, `status`, `amount_cents` |
| **Penalty** | Traffic/compliance penalties | `rider_id`, `vehicle_id`, `amount_cents`, `status` |
| **EnforcementLog** | Enforcement officer actions | `rider_id`, `vehicle_id`, `inspector_id`, `county_id`, `action`, `result` |
| **FeeSchedule** | County fee schedules | `county_id`, `fee_type`, `amount_cents` |
| **FeeRule** | Settlement split rules | `name`, `product_type`, `county_percentage`, `sacco_percentage`, `platform_percentage`, `version` |

### Payments & Settlement
| Entity | Purpose | Key Fields |
|---|---|---|
| **PaymentEvent** | Raw payment events | `transaction_id`, `provider`, `raw_payload` |
| **Settlement** | Processed settlements | `transaction_id`, `county_amount`, `sacco_amount`, `platform_amount`, `status` |
| **SasapayFeeTier** | SasaPay fee structure | `transaction_type`, `min_amount_kes`, `max_amount_kes`, `sasapay_base_fee_kes`, `is_percentage`, `fee_payer`, `bodasure_markup_kes`, `bodasure_markup_pct`, `bodasure_markup_type` |

### Insurance
| Entity | Purpose | Key Fields |
|---|---|---|
| **InsuranceProduct** | Insurance products | `merchant_id`, `name`, `premium_cents`, `coverage_type`, `duration_days`, `commission_percentage` |
| **Policy** | Active insurance policies | `vehicle_id`, `rider_id`, `product_id`, `merchant_id`, `start_date`, `end_date`, `premium_cents`, `status`, `transaction_id` |

### Communications
| Entity | Purpose | Key Fields |
|---|---|---|
| **SmsCampaign** | Bulk SMS campaigns | `name`, `message_body`, `audience_type`, `audience_filter_id`, `county_scope_id`, `status`, `total_recipients`, `sent_count`, `failed_count`, `batch_count`, `batches_processed` |
| **SmsTemplate** | SMS templates | `template_key`, `name`, `body`, `event_type`, `is_active`, `is_system` |
| **SmsLog** | Individual SMS log | `recipient_phone`, `message_body`, `template_key`, `event_type`, `at_message_id`, `status`, `user_id`, `delivered_at`, `failure_reason` |

### Disputes & Audit
| Entity | Purpose | Key Fields |
|---|---|---|
| **Dispute** | Transaction disputes | `rider_id`, `transaction_id`, `transaction_reference`, `amount_cents`, `category`, `reason`, `description`, `status`, `resolution_notes`, `resolved_by_id` |
| **AuditLog** | Audit trail | `user_id`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, `description` |
| **Announcement** | System announcements | `title`, `body`, `status`, `audience`, `county_id` |

---

## 3. Integration Points

### SasaPay (Wallet / Payments)
- **Purpose**: Personal wallet creation, STK push (M-Pesa), P2P transfers, business onboarding (counties/SACCOs)
- **Environment**: `SASAPAY_ENVIRONMENT` secret → `sandbox` or `production`
- **Base URLs**:
  - Auth: `https://{env}.sasapay.app/api/v1/auth/token/?grant_type=client_credentials`
  - API v2: `https://{env}.sasapay.app/api/v2`
- **Auth**: OAuth2 client_credentials — `SASAPAY_CLIENT_ID` + `SASAPAY_CLIENT_SECRET` → Bearer token
- **Merchant Code**: `SASAPAY_MERCHANT_CODE`
- **Key endpoints used**:
  - `POST /waas/personal-onboarding/` — init personal wallet
  - `POST /waas/personal-onboarding/confirmation/` — verify OTP
  - `POST /payments/c2b/` — STK push
  - `POST /waas/business-onboarding/` — business wallet creation
- **Webhook**: `sasapayWebhook` function — HMAC-SHA512 verification using `SASAPAY_CLIENT_ID`
- **Callback URL**: `{BASE44_APP_URL}/functions/sasapayWebhook` (no secret in URL query)

### IDAnalyzer (KYC / Identity Verification)
- **Purpose**: DocuPass identity verification (ID front, ID back, selfie)
- **Secrets**: `IDANALYZER_API_KEY`, `IDANALYZER_PROFILE_ID`, `IDANALYZER_WEBHOOK_SECRET`
- **Flow**: `createDocupassSession` → user completes scan in iframe → `idAnalyzerCallback` receives result → `processKycDecision` updates KycDocument + User
- **Webhook**: `idAnalyzerCallback` — idempotent, keyed off transactionId + decision status
- **Callback URL**: `{BASE44_APP_URL}/functions/idAnalyzerCallback`

### Africa's Talking (SMS)
- **Purpose**: OTP delivery, bulk SMS campaigns, transactional notifications
- **Secrets**: `AT_API_KEY`, `AT_USERNAME`, `AT_ENVIRONMENT` (sandbox/production), `AT_API_KEY_PRODUCTION`, `AT_USERNAME_PRODUCTION`
- **Sender ID**: "BodaSure" (sandbox) — configurable
- **Webhook**: `smsDeliveryCallback` — delivery status updates to SmsLog
- **Phone format**: Must be `+254XXXXXXXXX` (E.164) before AT API calls
- **Key functions**: `sendOtp`, `sendSms`, `sendBulkSms`, `createSmsCampaign`, `verifyOtpCode`

### PlateRecognizer (Number Plate OCR)
- **Purpose**: Verify bike number plates during registration
- **Secret**: `PLATERECOGNIZER_API_TOKEN`
- **Function**: `verifyPlateRecognizer`

### Mapbox (Maps / Geolocation)
- **Purpose**: Stage picker map, location confirmation during onboarding
- **Secret**: `VITE_MAPBOX_TOKEN` (frontend), `getMapboxToken` function (backend)

---

## 4. Backend Functions (35+)

### SasaPay / Wallet
| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `sasapayPersonalOnboarding` | Init/confirm/resendOtp personal wallet | User, Wallet | Wallet, AuditLog |
| `sasapayPersonalKycUpload` | Upload KYC docs to SasaPay | Wallet, KycDocument | Wallet |
| `sasapayStkPush` | Initiate STK push payment | Wallet, Transaction | Transaction |
| `sasapayProcessPayment` | Process payment completion | Transaction, Wallet | Transaction, WalletSnapshot, TransactionLeg, Settlement |
| `sasapayWebhook` | Receive SasaPay payment webhooks | — | Transaction, WalletSnapshot, AuditLog |
| `sasapayQueryStatus` | Query SasaPay transaction status | Transaction | Transaction |
| `sasapayLookupUser` | Lookup user by SasaPay account | User, Wallet | — |
| `adminLinkSasapayAccount` | Admin: manually link SasaPay account | User, Wallet | Wallet |
| `setWalletPin` | Set wallet PIN | User, Wallet | Wallet |
| `verifyWalletPin` | Verify wallet PIN | Wallet | — |
| `checkWalletPhoneVerified` | Check if wallet phone is verified | User, Wallet | — |

### KYC / Identity
| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `createDocupassSession` | Create IDAnalyzer DocuPass session | User | — |
| `idAnalyzerCallback` | Receive IDAnalyzer results | KycDocument | KycDocument, User, AuditLog |
| `idAnalyzerWebhookDeliveries` | List webhook deliveries | — | — |
| `processKycDecision` | Process KYC decision (v1) | KycDocument | KycDocument, User |
| `processKycDecisionV2` | Process KYC decision (v2) | KycDocument | KycDocument, User |
| `replayDocupassWebhook` | Replay a DocuPass webhook | — | KycDocument, User |
| `getPhase6Submissions` | Get Phase 6 KYC submissions | KycDocument, User | — |

### Onboarding & Verification
| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `completeOnboarding` | Mark onboarding complete | User | User |
| `completeVerification` | Mark verification complete | User, KycDocument, Vehicle | User |
| `checkPhoneUniqueness` | Check phone not in use | User | — |
| `checkNationalIdUniqueness` | Check national ID not in use | User | — |

### SMS / Communications
| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `sendOtp` | Send OTP via AT | User | SmsLog |
| `sendSms` | Send single SMS | — | SmsLog |
| `sendBulkSms` | Send bulk SMS | SmsCampaign, User | SmsLog, SmsCampaign |
| `createSmsCampaign` | Create SMS campaign | User, GroupMember | SmsCampaign |
| `smsDeliveryCallback` | AT delivery webhook | SmsLog | SmsLog |
| `verifyOtpCode` | Verify OTP | User | — |
| `testSms` | Test SMS sending | — | — |
| `seedSmsTemplates` | Seed default templates | — | SmsTemplate |

### Payments & Finance
| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `getTransactionLimits` | Get transaction limits | Wallet | — |
| `getRevenueSummary` | Revenue dashboard data | Transaction, Settlement | — |
| `getCountyReconciliation` | County reconciliation | Transaction, Settlement | — |
| `processSettlements` | Process pending settlements | Transaction, Settlement | Settlement, TransactionLeg |

### Compliance
| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `expirePermits` | Expire overdue permits | Permit | Permit |
| `verifyPlateRecognizer` | Verify plate via OCR | — | — |

### Admin / Data
| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `getFlagReviewData` | Flag review data | Vehicle, Stage, Inspection | — |
| `getPublicRiderVerification` | Public rider lookup | User, Vehicle | — |
| `getMapboxToken` | Return Mapbox token | — | — |
| `seedKisumuData` | Seed Kisumu county data | — | County, SubCounty, Ward, Stage |

---

## 5. Onboarding Flow (7 Phases)

```
Phase 0: Personal Profile + Wallet Activation
  → PhasePersonal component
  → sasapayPersonalOnboarding (init → confirm → PIN)
  → User fields: full_name, phone, national_id, county_id, middle_name
  → Wallet created with sasapay_account_number

Phase 1: Bike Registration
  → PhaseBike component
  → Vehicle entity created with plate_number, make, color, owner details
  → verifyPlateRecognizer validates plate

Phase 2: Map Bike Location
  → PhaseMapBike component
  → Vehicle updated with sub_county_id, ward_id, stage_id

Phase 3: Stage Assignment
  → PhaseStage component
  → Confirms stage assignment

Phase 4: SACCO Membership
  → PhaseSacco component
  → GroupMember created (pending → approved)

Phase 5: KYC Verification (DocuPass)
  → PhaseVerification component
  → createDocupassSession → user scans → idAnalyzerCallback
  → KycDocument statuses updated to approved
  → completeVerification sets user.verification_complete = true

Phase 6: Complete
  → CompletionScreen
  → completeOnboarding sets user.onboarding_complete = true
```

**Phase evaluation**: `getOnboardingPhase(user, vehicles, groupMembers, wallet)` in `lib/onboarding.js`

---

## 6. Security Model

### Auth Levels
- **User-scoped**: `base44.entities.X.filter({ user_id: user.id })` — default for frontend calls
- **Service-role**: `base44.asServiceRole.entities.X` — admin operations, used in backend functions after `base44.auth.me()` verification
- **Admin-only functions**: Verify `user.role === 'admin'` before executing

### Webhook Security
- **SasaPay**: HMAC-SHA512 signature verification using `SASAPAY_CLIENT_ID`, constant-time comparison
- **IDAnalyzer**: Shared secret validation (`IDANALYZER_WEBHOOK_SECRET`)
- **SMS delivery**: No auth (AT callback) — validated by message ID lookup

### User Entity (Built-in)
- Read-only fields: `id`, `created_date`, `email`
- Editable via `base44.auth.updateMe()`: `full_name`, `phone`, `national_id`, `county_id`, `middle_name`, `kyc_status`, `onboarding_complete`, `verification_complete`
- Service-role writes: Used in backend functions to persist names after OAuth refresh

---

## 7. Portal Access Matrix

| Portal | Route Prefix | Required Role | Layout |
|---|---|---|---|
| Rider App | `/app` | authenticated user | `RiderLayout` (mobile-first) |
| County Portal | `/county` | `county_admin` | `StaffLayout accent="emerald"` |
| SACCO Portal | `/sacco` | `sacco_admin` | `StaffLayout accent="blue"` |
| Merchant Portal | `/merchant` | `merchant_admin` | `StaffLayout accent="emerald"` |
| Field Agent Portal | `/agent` | `field_agent` | `StaffLayout accent="orange"` |
| Stage Portal | `/stage` | `stage_admin` | `StaffLayout accent="blue"` |
| Admin Portal | `/admin` | `super_admin` or `bodasure_staff` | `StaffLayout accent="orange"` |

**Public routes** (no auth): `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify/:riderId`

---

## 8. Secrets Reference

| Secret | Used By | Purpose |
|---|---|---|
| `SASAPAY_CLIENT_ID` | sasapayPersonalOnboarding, sasapayWebhook, sasapayStkPush, sasapayProcessPayment | OAuth client ID + HMAC webhook verification |
| `SASAPAY_CLIENT_SECRET` | sasapayPersonalOnboarding, sasapayStkPush | OAuth client secret |
| `SASAPAY_MERCHANT_CODE` | sasapayPersonalOnboarding, sasapayStkPush | SasaPay merchant identifier |
| `SASAPAY_ENVIRONMENT` | All SasaPay functions | `sandbox` or `production` |
| `SASAPAY_WEBHOOK_SECRET` | (legacy — currently uses CLIENT_ID for HMAC) | Webhook verification |
| `IDANALYZER_API_KEY` | createDocupassSession, processKycDecision | IDAnalyzer API access |
| `IDANALYZER_PROFILE_ID` | createDocupassSession | DocuPass profile config |
| `IDANALYZER_WEBHOOK_SECRET` | idAnalyzerCallback | Webhook authenticity verification |
| `AT_API_KEY` | sendOtp, sendSms, sendBulkSms, verifyOtpCode | Africa's Talking API key |
| `AT_USERNAME` | sendOtp, sendSms, sendBulkSms | Africa's Talking username |
| `AT_ENVIRONMENT` | sendOtp, sendSms, sendBulkSms | `sandbox` or `production` |
| `AT_API_KEY_PRODUCTION` | sendOtp, sendSms (when AT_ENVIRONMENT=production) | Production API key |
| `AT_USERNAME_PRODUCTION` | sendOtp, sendSms (when AT_ENVIRONMENT=production) | Production username |
| `PLATERECOGNIZER_API_TOKEN` | verifyPlateRecognizer | Plate OCR API token |
| `VITE_MAPBOX_TOKEN` | Frontend map components | Mapbox access token |
| `BASE44_APP_URL` | sasapayPersonalOnboarding, sasapayStkPush | App URL for callback URLs |

---

## 9. Automations (Scheduled)

| Automation | Function | Schedule | Purpose |
|---|---|---|---|
| Permit Expiry | `expirePermits` | Daily (check `list_automations` for exact time) | Expire overdue permits |
| Settlement Processing | `processSettlements` | Periodic | Process pending transaction settlements |

---

## 10. File Structure

```
src/
├── App.jsx                    # Router + auth provider
├── main.jsx                   # Entry point
├── index.css                  # Design tokens
├── api/base44Client.js        # Pre-initialized SDK
├── pages/
│   ├── rider/                 # Rider app pages
│   ├── county/                # County portal
│   ├── sacco/                 # SACCO portal
│   ├── merchant/              # Merchant portal
│   ├── agent/                 # Field agent portal
│   ├── stage/                 # Stage portal
│   ├── admin/                 # Admin portal
│   ├── public/                # Public pages
│   ├── Login.jsx / Register.jsx / ForgotPassword.jsx / ResetPassword.jsx
├── components/
│   ├── rider/                 # Rider components
│   │   ├── onboarding/        # 7-phase onboarding components
│   │   │   ├── verification/  # Phase 5 sub-tasks
│   │   │   ├── map/           # Stage picker map
│   ├── staff/                 # Staff portal layout
│   ├── admin/                 # Admin components
│   ├── ui/                    # shadcn/ui components
├── entities/                  # JSON schemas (30+ files)
├── functions/                 # Deno backend functions (35+ files)
├── lib/                       # Utilities, auth, phone, payments
├── hooks/
└── agents/                    # AI agent configs
``
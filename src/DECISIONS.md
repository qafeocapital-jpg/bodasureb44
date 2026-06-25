# BodaSure Architectural Decisions Log

> **Append-only**: New decisions go at the TOP with a date. Never delete or modify past entries.
> **AI WORKFLOW RULE**: Read this before any code change to understand locked decisions.
> Last updated: 2026-06-25

---

## How to Add a Decision

```markdown
### [DATE] Decision Title
**Context**: Why this decision was needed
**Decision**: What was decided
**Rationale**: Why this approach over alternatives
**Impact**: Which files/functions/entities are affected
**Status**: Active | Superseded by [date]
```

---

## Active Decisions

### [2026-06-25] Stabilization Layers — Persistent Docs + File Refactoring + QA Checklists
**Context**: AI development workflow producing regressions, silent dependency breaks, and patch-on-patch spaghetti as codebase grew to 30+ entities and 35+ functions.
**Decision**: Introduce three structural layers: (1) persistent architecture docs at root (ARCHITECTURE.md, DECISIONS.md, FEATURE_CONTRACTS.md, QA_CHECKLISTS.md), (2) file refactoring — no file exceeds 200 lines, every component does one thing, (3) manual QA checklists for critical flows. Enforce workflow rule: AI reads docs first, states impact list, user approves before code.
**Rationale**: Root cause of AI errors is context degradation from conversation compaction and oversized files. Persistent docs survive compaction; small files are easier to reason about; checklists catch regressions.
**Impact**: All files. New docs at project root. Large files (Home.jsx, PhasePersonal, sasapayPersonalOnboarding) split into focused sub-components.
**Status**: Active

---

### [2026-06-25] Name Lock-in After OTP Confirmation
**Context**: OAuth token refreshes were reverting user-entered names (e.g., "Robert Maina") back to OAuth-provider profile data on subsequent `auth.me()` calls.
**Decision**: After successful SasaPay OTP confirmation, `confirmPersonalOnboarding` performs a service-role write-back of `full_name` and `middle_name` to the User entity, overriding any OAuth-derived names permanently.
**Rationale**: User-entered names during onboarding take precedence — they match official identity documents used for KYC matching.
**Impact**: `functions/sasapayPersonalOnboarding` → `confirmPersonalOnboarding()` function. Also `PhasePersonal` → `handleInitWallet()` saves profile via `base44.auth.updateMe()` BEFORE wallet activation.
**Status**: Active

---

### [2026-06-25] Hard-Block on Duplicate Phone/National ID
**Context**: Users could re-register with existing phone/ID numbers, creating duplicate accounts.
**Decision**: Hard-block registration if phone or National ID exists in BodaSure. No recovery path, no auto-relinking. Server-side checks in `sasapayPersonalOnboarding` (defense-in-depth against client bypass) plus client-side checks via `checkPhoneUniqueness` and `checkNationalIdUniqueness` functions.
**Rationale**: Prevents duplicate wallets, KYC mismatches, and fraudulent re-registration. Users must use different credentials or contact support.
**Impact**: `functions/sasapayPersonalOnboarding` → `initializePersonalOnboarding()`. `components/rider/onboarding/PhasePersonal` → `checkPhoneUniqueness()`, `checkIdUniqueness()`. `functions/checkPhoneUniqueness`, `functions/checkNationalIdUniqueness`.
**Status**: Active

---

### [2026-06-25] No Recovery/Relinking Path on SasaPay Onboarding
**Context**: Previous "recover existing SasaPay account" flow created security holes and confused users.
**Decision**: Removed `recoverExistingSasaPayAccount` function entirely. If a wallet already exists in SasaPay for a phone/ID, hard-block with a clear message. No auto-recovery, no relinking.
**Rationale**: Strict duplicate blocking is safer than attempting recovery, which can create race conditions and data inconsistencies.
**Impact**: `functions/sasapayPersonalOnboarding`. Any mention of "recovered" response should be treated as dead code.
**Status**: Active

---

### [2026-06-25] Idempotent IDAnalyzer Callback Processing
**Context**: IDAnalyzer webhook deliveries could be duplicated, causing double-processing of KYC decisions.
**Decision**: `idAnalyzerCallback` processes idempotently by keying off `transactionId` + decision status. If a callback with the same transactionId and decision status is received again, it's a no-op. If the API re-fetch fails, return HTTP 500 to trigger IDAnalyzer's built-in retry mechanism.
**Rationale**: Prevents duplicate KycDocument updates and user notifications from webhook redelivery.
**Impact**: `functions/idAnalyzerCallback`.
**Status**: Active

---

### [2026-06-25] Constant-Time HMAC Comparison on Webhooks
**Context**: SasaPay webhooks could be spoofed if comparison was non-constant-time (timing attacks).
**Decision**: `sasapayWebhook` uses HMAC-SHA512 header verification with `SASAPAY_CLIENT_ID` as the secret, incorporating constant-time comparison. Webhook secret removed from callback URL query strings to prevent leakage.
**Rationale**: Prevents timing attacks on webhook signature verification and prevents secret exposure in URLs/logs.
**Impact**: `functions/sasapayWebhook`. All SasaPay callback URLs use `{BASE44_APP_URL}/functions/sasapayWebhook` with no query params.
**Status**: Active

---

### [2026-06-25] E.164 Phone Normalisation
**Context**: Inconsistent phone number formats caused SasaPay and Africa's Talking API failures.
**Decision**: All phone numbers normalised to E.164 format (`254XXXXXXXXX`) before any SasaPay or AT API call. Normalisation strips leading `0` or `254` prefix and prepends `254`. Client-side: `normalizePhone()` in `lib/phone.js`. Backend: inline normalisation in functions.
**Rationale**: SasaPay and AT APIs require E.164 format. Consistent normalisation prevents API errors.
**Impact**: `lib/phone.js`, `components/ui/PhoneInput`, `functions/sasapayPersonalOnboarding`, `functions/sendOtp`, `functions/sendSms`, `functions/sendBulkSms`.
**Status**: Active

---

### [2026-06-25] Lazy Wallet Creation on Confirm
**Context**: SasaPay init could succeed but no Wallet entity existed yet (edge case during initial onboarding).
**Decision**: If `confirmPersonalOnboarding` finds no personal wallet for the user, it creates one at confirm time. `initializePersonalOnboarding` logs a warning if no wallet is found but still returns success.
**Rationale**: Prevents blocking onboarding on a timing edge case where wallet creation and SasaPay init are out of sync.
**Impact**: `functions/sasapayPersonalOnboarding` → `confirmPersonalOnboarding()`, `initializePersonalOnboarding()`.
**Status**: Active

---

### [2026-06-25] Profile Save Before Wallet Activation
**Context**: If wallet init failed after profile was saved, users had to re-enter all details.
**Decision**: In `PhasePersonal.handleInitWallet()`, save the profile FIRST via `base44.auth.updateMe()` (persisting full_name, phone, national_id, county_id, middle_name), THEN initiate wallet activation. If wallet init fails, profile is already saved — user can retry wallet activation only.
**Rationale**: Minimizes user friction on retry. Profile data is always persisted even if wallet activation fails.
**Impact**: `components/rider/onboarding/PhasePersonal` → `handleInitWallet()`.
**Status**: Active

---

### [2026-06-25] SasaPay Account Number String Coercion
**Context**: SasaPay returns `accountNumber` as an integer, but the Wallet entity schema requires a string. This caused 422 validation errors on wallet update.
**Decision**: `confirmPersonalOnboarding` coerces `data.data.accountNumber` to string: `String(data.data.accountNumber)` before writing to Wallet entity.
**Rationale**: Schema validation requires string; SasaPay API returns integer.
**Impact**: `functions/sasapayPersonalOnboarding` → `confirmPersonalOnboarding()`.
**Status**: Active

---

### [2026-06-25] Onboarding Error Logging to Admin Dashboard
**Context**: Failed onboarding attempts were invisible to admins — no way to debug why users couldn't register.
**Decision**: All onboarding failures (duplicate phone, duplicate ID, duplicate SasaPay wallet, SasaPay API errors) are logged to AuditLog with `action: 'wallet_onboarding_failed'` and error details. These are visible in the Admin SasaPay module under an "Onboarding Errors" tab.
**Rationale**: Admins need visibility into onboarding failures to provide support and identify systematic issues.
**Impact**: `functions/sasapayPersonalOnboarding` → `logOnboardingError()`. `pages/admin/SasaPay`.
**Status**: Active

---

### [2026-06-25] Completed Onboarding Phases Are Non-Interactive
**Context**: Users could loop back to completed onboarding phases and accidentally re-trigger actions.
**Decision**: Completed phases render in read-only mode (grayed-out, `pointer-events-none`) with a `ReadOnlyBanner` and `ReadOnlyBackButton`. Users can view but not modify completed steps. To modify, they contact support.
**Rationale**: Prevents accidental re-triggering of wallet activation, bike re-registration, etc.
**Impact**: `components/rider/onboarding/ReadOnlyBanner`. All Phase* components accept `readOnly` prop.
**Status**: Active

---

### [2026-06-25] Legacy KycDocument Auto-Purge
**Context**: Old KYC documents without `provider_reference` (pre-IDAnalyzer) were causing issues in the verification flow.
**Decision**: On Profile page load, silently delete any KycDocument where `provider_reference` is missing AND `provider_name !== 'idanalyzer_docupass'` AND `document_type` is id_front/id_back/selfie. Non-blocking.
**Rationale**: Ensures only IDAnalyzer-processed documents participate in verification logic.
**Impact**: `pages/rider/Profile` → `useEffect` load function.
**Status**: Active

---

### [2026-06-25] Official Identity Document Names Take Precedence
**Context**: OAuth email profiles had different names than official ID documents, causing KYC mismatches.
**Decision**: Names entered by the user during onboarding take precedence and permanently override OAuth-provider names. KYC matching uses official identity document data, not OAuth email profiles.
**Rationale**: Identity verification must match government-issued documents, not social login profiles.
**Impact**: `components/rider/onboarding/PhasePersonal`. `functions/sasapayPersonalOnboarding` → name lock-in.
**Status**: Active

---

### [2026-06-25] BodaSure Branding for SasaPay
**Context**: Users didn't understand what "SasaPay" was in user-facing messages.
**Decision**: All user-facing messaging uses "BodaSure Wallet" instead of "SasaPay". Backend functions/logs retain "SasaPay" for technical clarity.
**Rationale**: Users know they have a "BodaSure Wallet" — mentioning "SasaPay" confuses them.
**Impact**: All `components/rider/` and `pages/rider/` files. Backend functions retain SasaPay references.
**Status**: Active

---

### [2026-06-25] SMS Environment Controlled by AT_ENVIRONMENT
**Context**: Sending SMS in production while AT_ENVIRONMENT was sandbox caused silent failures.
**Decision**: SMS production environment is strictly controlled by the `AT_ENVIRONMENT` secret. When `production`, functions use `AT_API_KEY_PRODUCTION` / `AT_USERNAME_PRODUCTION`. When `sandbox`, they use `AT_API_KEY` / `AT_USERNAME`. Default sender ID is "BodaSure".
**Rationale**: Prevents accidental production SMS sends during testing and vice versa.
**Impact**: `functions/sendOtp`, `functions/sendSms`, `functions/sendBulkSms`, `functions/verifyOtpCode`.
**Status**: Active

---

### [2026-06-25] SMS Campaign Progress Tracking
**Context**: Bulk SMS campaigns had no visibility into progress.
**Decision**: Bulk SMS campaigns tracked via dedicated "Campaigns" tab in Communications module. SmsCampaign entity tracks `sent_count`, `failed_count`, `batch_count`, `batches_processed`.
**Rationale**: Admins need real-time campaign progress visibility.
**Impact**: `pages/admin/Communications`, `components/admin/comms/CampaignsPage`, `functions/sendBulkSms`.
**Status**: Active

---

### [2026-06-25] County People Management Tabbed Interface
**Context**: County portal had too many entity types (riders, SACCOs, stages) on one page.
**Decision**: County People management pages use a tabbed interface for distinct entity types.
**Rationale**: Cleaner UX — admins can switch between Riders, SACCOs, and Stages without scrolling.
**Impact**: `pages/county/OtherPages`.
**Status**: Active

---

### [2026-06-25] SasaPay Error Code Mapping
**Context**: SasaPay returns error codes (SP4090, SP5030, SP9000, SP4045) that users don't understand.
**Decision**: SasaPay response codes trigger specific UI feedback for each known error code. Unknown errors show a generic "We encountered an issue" message.
**Rationale**: Better UX — users see actionable messages instead of raw API codes.
**Impact**: `functions/sasapayPersonalOnboarding` → error mapping in `initializePersonalOnboarding()`.
**Status**: Active

---

### [2026-06-25] BASE44_APP_URL as SasaPay Callback URL
**Context**: SasaPay callbacks needed a stable, environment-aware URL.
**Decision**: SasaPay init payload injects `BASE44_APP_URL` as the `callbackUrl` to receive status webhooks. No secrets in the URL.
**Rationale**: Ensures webhooks reach the correct environment (sandbox/production) without hardcoding URLs.
**Impact**: `functions/sasapayPersonalOnboarding`, `functions/sasapayStkPush`.
**Status**: Active
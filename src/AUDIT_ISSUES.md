# BodaSure Platform Audit — Issues Found & Fixed

## CRITICAL (Breaks Core Functionality)

### 1. KYC Status Mismatch — Tier 2 NEVER unlocks
- **Where:** `lib/serviceAccess.js` line 16, `lib/verification.js` line 68
- **Bug:** `kyc_status` is checked as `=== 'approved'` but `processKycDecisionV2.js` and the User entity schema use `'verified'`
- **Impact:** Tier 2 features (send, withdraw, lipa_owner, services) NEVER unlock after KYC approval
- **Fix:** Change checks from `'approved'` to `'verified'`

### 2. Dead Import Breaks processKycDecisionV2 Backend Function
- **Where:** `functions/processKycDecisionV2.js` line 2
- **Bug:** `import { getConfiguredProvider, KYC_PROVIDERS, isAutomatedProvider } from '../lib/kycProviders.js'` — relative imports fail in Deno (functions deploy independently)
- **Impact:** The entire KYC decision function crashes at boot — admins can't approve/reject KYC
- **Fix:** Remove the unused import (none of the imported symbols are used in the function body)

### 3. sasapayStkPush Wallet Lookup Uses User-Scoped SDK
- **Where:** `functions/sasapayStkPush.js` line 55
- **Bug:** `base44.entities.Wallet.filter({ id: walletId })` uses user-scoped SDK, which may fail due to RLS
- **Fix:** Use `base44.asServiceRole.entities.Wallet.filter`

### 4. WalletSnapshot Missing in Webhook — Balance Never Updates
- **Where:** `functions/sasapayWebhook.js` lines 111-121
- **Bug:** If `snapshots.length === 0`, the wallet balance is silently never updated
- **Fix:** Create a WalletSnapshot if none exists

## HIGH (Security/Data Integrity)

### 5. WalletActivate Uses User-Scoped SDK for Wallet Update
- **Where:** `pages/rider/WalletActivate.jsx` line 117
- **Bug:** `base44.entities.Wallet.update(wallet.id, {...})` — wallet updates should work but may fail with RLS
- **Fix:** Acceptable as-is for user-owned wallets (RLS allows owner updates)

### 6. Race Condition in mockPayments Balance Updates
- **Where:** `lib/mockPayments.js` lines 100-111, 128-134, 139-148
- **Bug:** Read-then-write pattern — concurrent transactions can lose balance updates
- **Note:** Mock mode only; live SasaPay handles atomicity server-side. Low priority.

## MEDIUM (Performance)

### 7. getTransactionLimits Fetches ALL Completed Transactions
- **Where:** `functions/getTransactionLimits.js` lines 47-53, 78-82
- **Bug:** Fetches ALL completed transactions for a wallet without pagination or date filtering
- **Impact:** For active wallets, this loads thousands of records into memory
- **Fix:** Add limit and client-side date filter (already filters by date, but loads all first)

### 8. N+1 Query in LipaCounty Fee Split
- **Where:** `pages/rider/LipaCounty.jsx` lines 136-148
- **Bug:** Loops through group memberships calling `Group.get(gid)` for each
- **Fix:** Batch fetch groups

### 9. Artificial 1.2s Delay in mockPayments
- **Where:** `lib/mockPayments.js` line 92
- **Bug:** `await new Promise(resolve => setTimeout(resolve, 1200))` wastes server time
- **Fix:** Reduce to 100ms or remove

### 10. processSettlements Limited to 500 Legs
- **Where:** `functions/processSettlements.js` line 40
- **Bug:** Only fetches last 500 legs — older legs never get settled
- **Fix:** Add pagination loop

## LOW (Minor Issues)

### 11. sasapayPersonalOnboarding API URL Version Mismatch
- **Where:** `functions/sasapayPersonalOnboarding.js` line 209
- Uses `/api/v2` while other SasaPay functions use `/api/v1`
- This may be correct (different endpoints use different versions) — needs SasaPay API docs to confirm

### 12. feeEngine Returns Cents but Names Variables "Kes"
- **Where:** `lib/feeEngine.js` lines 45-47
- **Note:** Working correctly — frontend divides by 100 for display. Confusing naming but functional.
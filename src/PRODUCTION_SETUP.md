# Production Environment Setup

## SMS & SasaPay Configuration

BodaSure now supports seamless switching between **sandbox** (testing) and **production** (live) environments.

---

## Environment Variables

### Current Secrets (Already Set ✅)
- `AT_ENVIRONMENT` — Controls SMS environment: `"sandbox"` or `"production"`
- `AT_USERNAME` — Sandbox Africa's Talking username
- `AT_API_KEY` — Sandbox Africa's Talking API key
- `AT_USERNAME_PRODUCTION` — Production AT username (newly set)
- `AT_API_KEY_PRODUCTION` — Production AT API key (newly set)

---

## How It Works

All SMS functions automatically detect the environment and use the correct credentials:

```javascript
// Functions that switch environments automatically:
- sendSms()
- sendOtp()
- createSmsCampaign()
- sendBulkSms()
- testSms()

// Fallback behavior:
// If production credentials not provided, falls back to sandbox credentials
// This allows gradual migration from sandbox → production
```

---

## Switching to Production

### Step 1: Verify Production Credentials
Make sure these secrets are set in Base44 Dashboard:
- ✅ `AT_USERNAME_PRODUCTION`
- ✅ `AT_API_KEY_PRODUCTION`

### Step 2: Set AT_ENVIRONMENT to Production
In Base44 Dashboard → App Settings → Secrets:
```
AT_ENVIRONMENT = "production"
```

### Step 3: Test SMS Delivery
Run the test function with a real phone number:
```javascript
// Call via Admin Communications tab
testSms({ phone: "+254705378676", message: "Production SMS test" })
```

Expected response:
```json
{
  "success": true,
  "sentTo": "+254705378676",
  "atMessageId": "ATXid_...",
  "sendStatus": "sent"
}
```

### Step 4: Monitor SMS Logs
Navigate to Admin → Communications → SMS Logs to verify delivery status.

---

## Security Notes

1. **Phone Number Sanitization** ✅
   - All SMS functions automatically format phone numbers to Africa's Talking format: `+254XXXXXXXXX`
   - Users can input any format: `0705378676`, `254705378676`, `+254705378676`
   - System standardizes before sending

2. **Credentials Hierarchy**
   - Production API keys override sandbox in production environment
   - Fallback to sandbox keys if production keys missing (for testing)
   - Never expose production credentials in logs or responses

3. **Production Best Practices**
   - Test with small batches before large campaigns
   - Monitor SMS Logs for delivery failures
   - Set up SmsLog alerts for failures > 5%
   - Use AT's built-in delivery callbacks for tracking

---

## Sender ID Configuration

### Sandbox (Current)
- Default sender: `"BodaSure"` or auto-assigned by AT
- No special configuration needed

### Production
To use a custom sender ID in production:
1. Contact Africa's Talking support
2. Register your sender ID: `"BODASURE"`
3. Update function code to use sender ID parameter (optional — defaults to AT account setting)

---

## Rollback to Sandbox

If you need to revert to sandbox for testing:

1. Set `AT_ENVIRONMENT` back to `"sandbox"`
2. No code changes needed — all functions auto-detect the environment
3. SMS will route through Africa's Talking sandbox API

---

## SasaPay Production (When Ready)

When you're ready to move SasaPay to production:

1. Set these secrets:
   - `SASAPAY_ENVIRONMENT` → `"production"`
   - `SASAPAY_CLIENT_ID_PRODUCTION` (if different)
   - `SASAPAY_CLIENT_SECRET_PRODUCTION` (if different)

2. Update backend functions that call SasaPay to use production credentials
3. SasaPay will automatically route to production endpoints

---

## Callback Handlers (For Future)

Africa's Talking sends delivery confirmations to:
- **Endpoint:** (to be configured in AT dashboard)
- **Events:** Delivery confirmations, failed SMS, etc.
- **Handler:** Currently logged to SmsLog; future: real-time delivery status updates

---

## IDAnalyzer DocuPass KYC Configuration

The identity verification flow uses IDAnalyzer's **DocuPass** hosted verification — a guided flow that handles ID capture (front + back) and active liveness face check entirely within IDAnalyzer's UI.

### Prerequisites

The following secrets must be set (already configured ✅):
- `IDANALYZER_API_KEY` — IDAnalyzer v2 API key
- `IDANALYZER_PROFILE_ID` — KYC Profile ID from the IDAnalyzer portal (**must be a valid 32-char profile ID**)
- `IDANALYZER_WEBHOOK_SECRET` — Webhook signing secret (from portal API Keys page, used for HMAC verification)
- `BASE44_APP_URL` — App URL for constructing webhook callback URLs

### KYC Profile Setup (IDAnalyzer Portal)

In the [IDAnalyzer Portal](https://portal2.idanalyzer.com/), create or edit a KYC Profile with these settings:

**General Tab:**
- Webhook URL: `{BASE44_APP_URL}/api/fn/idAnalyzerCallback?secret={IDANALYZER_WEBHOOK_SECRET}`
  - The `secret` query param is a backward-compat fallback for testing. Production uses HMAC signature verification (X-IDA-Signature + X-IDA-Timestamp headers).
- Webhook Signing Secret: Copy the secret from the portal **API Keys** page and set it as the `IDANALYZER_WEBHOOK_SECRET` secret in Base44.

**DocuPass Tab:**
- Mode: ID verification + Face verification (mode 0)
- **Enable "Save Output Images"** — REQUIRED so the webhook receives `outputImage.front`, `outputImage.back`, `outputImage.face` CDN URLs. Without this, document image URLs won't be available for SasaPay KYC push.
- Enable "DocuPass Audit Report" (nice-to-have for compliance records)
- Redirect URLs: `{BASE44_APP_URL}/app/account` (users return here after completing verification)
- Company Name: BodaSure (shown in footer)

**Verification Settings:**
- Document Type: National ID
- Country: Kenya (KE)
- Face Match: Enabled
- Liveness: Active (head movement challenge)

After saving, copy the **Profile ID** (32-character hex string) and set it as the `IDANALYZER_PROFILE_ID` secret in the Base44 dashboard.

### How It Works (Atomic KYC Flow)

1. Rider clicks "Start Secure Verification" in the identity sub-task
2. `createDocupassSession` backend function creates a DocuPass session with `customData = user.id`
3. DocuPass URL opens in a new tab (mobile) or iframe overlay (desktop)
4. IDAnalyzer guides the user through ID capture + active liveness check
5. On completion, IDAnalyzer sends a `docupass_conclusive` webhook to `idAnalyzerCallback`
6. The callback:
   - Validates HMAC signature (or query-secret fallback)
   - Upserts all 3 KycDocument records (id_front, id_back, selfie) with CDN image URLs + status
   - Hydrates the user's profile (name, DOB, national ID) from extracted identity data
   - **Auto-pushes documents to SasaPay KYC** (on `accept` decision only) using the IDAnalyzer image URLs — no manual step required
   - Sends an SMS notification to the rider (approved/rejected templates)
   - Creates AuditLog entries for the completion + SasaPay outcome
7. The frontend polls for status updates and shows success/rejection

**Error handling tiers:**
- HMAC failure → HTTP 401 (IDAnalyzer retries — intentional)
- Unknown event type → HTTP 200 (silent accept, idempotency)
- Missing user → HTTP 200 + console.warn (don't retry)
- DB failure → HTTP 500 (IDAnalyzer retries — intentional)
- SasaPay failure → HTTP 200 + AuditLog + `needs_review` flag (don't retry webhook)

---

## Testing Checklist

- [ ] Production AT credentials entered in Base44
- [ ] AT_ENVIRONMENT set to "production"
- [ ] Test SMS sent to real phone number
- [ ] SMS appears in Communications → SMS Logs
- [ ] Message shows as "sent" or "delivered"
- [ ] No sensitive data in logs
- [ ] Bulk SMS campaign tested with small batch (10-20 recipients)
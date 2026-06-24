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

## Testing Checklist

- [ ] Production AT credentials entered in Base44
- [ ] AT_ENVIRONMENT set to "production"
- [ ] Test SMS sent to real phone number
- [ ] SMS appears in Communications → SMS Logs
- [ ] Message shows as "sent" or "delivered"
- [ ] No sensitive data in logs
- [ ] Bulk SMS campaign tested with small batch (10-20 recipients)
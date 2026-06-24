# BodaSure SMS & Communications Audit Report

## Executive Summary
Critical issues identified in SMS delivery, logging, UI visibility, and data integrity. Multiple components not functioning as specified in implementation plan.

---

## CRITICAL ISSUES

### 1. **SendSmsModal uses createSmsCampaign instead of sendSms**
**Severity:** HIGH  
**Location:** `components/admin/comms/SendSmsModal` (line 62-67)  
**Issue:** 
- Direct SMS sends are going through `createSmsCampaign` (intended for bulk campaigns)
- Creates unnecessary SmsCampaign records for 1:1 messaging
- Delays delivery (async batch processing instead of immediate send)
- SMS logs created via sendBulkSms, not sendSms - logs marked as 'bulk' event type
- Should use `sendSms` backend function directly

**Impact:** SMS delays, incorrect event type classification, pollutes campaign history

---

### 2. **SMS Logs Tab Missing from UserProfileDrawer**
**Severity:** CRITICAL  
**Location:** `components/admin/UserProfileDrawer` (TabsList)  
**Issue:**
- No "SMS Logs" tab in user profile despite SMS button being visible
- Tab list hardcoded to only show: Personal, Wallet, KYC, Bikes, Groups, Submissions, Roles
- User cannot view SMS history for a specific recipient
- SendSmsModal onSuccess callback doesn't reload SMS logs

**Impact:** Admin cannot verify SMS delivery to specific users

---

### 3. **SMS Logs Not Filtered by User in SmsLogsPage**
**Severity:** HIGH  
**Location:** `components/admin/comms/SmsLogsPage`  
**Issue:**
- SmsLogsPage loads ALL SMS logs globally, no user filtering
- When called from UserProfileDrawer, should filter by `user_id` (for sendSms) or query phone
- No recipient phone field visible in the log query to match

**Impact:** Cannot track SMS delivery for individual users

---

### 4. **createSmsCampaign Doesn't Store Recipient Phone for Individual SMS**
**Severity:** HIGH  
**Location:** `functions/createSmsCampaign` (line 67)  
**Issue:**
- Line 67: `audience_phone: audiencePhone || null`
- For individual SMS, phone is stored in SmsCampaign, not in SmsLog records
- SmsLog is created with `recipient_phone` but linked to campaign records, not direct SMS
- No link between SmsCampaign and generated SmsLog records for tracking

**Impact:** Cannot trace which campaign generated which SMS logs

---

### 5. **sendBulkSms Creates Logs with event_type: 'bulk'**
**Severity:** MEDIUM  
**Location:** `functions/sendBulkSms`  
**Issue:**
- All SMS from campaigns logged with event_type='bulk' regardless of source
- sendSms logs with event_type from parameter (otp, deposit, etc.)
- Inconsistent classification - direct SMS should be logged differently than bulk

**Impact:** Cannot distinguish between transactional and campaign SMS in logs

---

### 6. **No User Lookup in SmsLogsPage County Scoping**
**Severity:** MEDIUM  
**Location:** `components/admin/comms/SmsLogsPage` (for county scope)  
**Issue:**
- SmsLogsPage accepts `countyScope` prop but doesn't filter logs by county
- Logs are not linked to User.county_id, so filtering impossible
- County admin sees all SMS logs globally instead of county-only

**Impact:** County admins cannot isolate their communications

---

### 7. **Missing SendSmsModal user_id Capture**
**Severity:** HIGH  
**Location:** `components/admin/comms/SendSmsModal`  
**Issue:**
- SendSmsModal does not pass user_id to createSmsCampaign
- SmsLog created without user_id link to the recipient
- Cannot query "all SMS sent to user X"

**Impact:** No audit trail linking SMS to specific recipient users

---

### 8. **SmsCampaign User_id References Only Sender, Not Recipients**
**Severity:** CRITICAL  
**Location:** `entities/SmsCampaign` schema + `functions/createSmsCampaign`  
**Issue:**
- SmsCampaign.created_by_id = admin sending the SMS
- No recipient_user_id or recipient_phone_list field
- Bulk campaigns don't store structured recipient info
- SmsLog.user_id should reference recipient, but createSmsCampaign doesn't capture it

**Impact:** Cannot track "all SMS sent to user X" or audit user communication history

---

### 9. **County Communications Page Not Scoped to County**
**Severity:** CRITICAL  
**Location:** `pages/county/Communications.jsx`  
**Issue:**
- Reuses admin Communications component
- Does not pass `countyScope={countyId}` to SMS pages
- County admins can send to all riders globally, not just their county
- Bulk SMS page not county-scoped

**Impact:** SECURITY ISSUE - County admins bypass scope restrictions

---

### 10. **SMS Logs Recipient Phone Not Searchable/Filterable**
**Severity:** MEDIUM  
**Location:** `components/admin/comms/SmsLogsPage`  
**Issue:**
- Table shows "Phone" column but no filter/search by phone
- Cannot query "all SMS to +254705378676"
- Filter UI only has Status, Event Type, Date Range

**Impact:** Cannot find SMS delivery history for specific phone number

---

### 11. **createSmsCampaign Triggers sendBulkSms Async Without Status Check**
**Severity:** MEDIUM  
**Location:** `functions/createSmsCampaign` (line 76-80)  
**Issue:**
- Line 77: `await base44.functions.invoke('sendBulkSms', { campaignId: campaign.id });`
- Error in sendBulkSms is caught and logged but doesn't update campaign status
- Campaign remains in 'queued' status even if send fails
- No retry mechanism

**Impact:** Failed campaigns silently fail, admin unaware of delivery issues

---

### 12. **sendBulkSms Processes Entire Recipient List in Memory**
**Severity:** MEDIUM  
**Location:** `functions/sendBulkSms`  
**Issue:**
- Loads all recipients into memory before batching
- For 1M riders, this could OOM
- No pagination or streaming

**Impact:** Scalability issue - platform crashes with large campaigns

---

### 13. **User.county_id Not Guaranteed on All Users**
**Severity:** HIGH  
**Location:** Multiple locations (createSmsCampaign filtering, County scope)  
**Issue:**
- Filtering by `User.county_id` assumes all users have this field
- Field may be missing for staff accounts, imported data, legacy users
- Batch operations filter on county_id but some users may be null

**Impact:** Filters exclude users, SMS delivery incomplete

---

### 14. **SmsLogsPage County Scope Parameter Accepted But Unused**
**Severity:** MEDIUM  
**Location:** `components/admin/comms/SmsLogsPage`  
**Issue:**
- Function accepts `countyScope` prop
- Does not pass to entity filter queries
- No usage in the component

**Impact:** Dead code, misleading API

---

### 15. **No Error Recovery for Failed SMS Sends**
**Severity:** MEDIUM  
**Location:** `functions/sendBulkSms`  
**Issue:**
- If AT API fails mid-batch, remaining SMS unsent but marked completed
- No dead-letter queue or retry logic
- Campaign status doesn't reflect partial failures

**Impact:** SMS delivery reliability compromised

---

### 16. **UserProfileDrawer SMS Success Callback Doesn't Reload UI**
**Severity:** MEDIUM  
**Location:** `components/admin/UserProfileDrawer` (line 360)  
**Issue:**
- `onSuccess={onLinked}` passed to SendSmsModal
- onLinked typically reloads user list, not SMS logs
- SMS tab not refreshed after sending

**Impact:** Admin sends SMS but cannot verify in UI

---

### 17. **AT_ENVIRONMENT Configuration Inconsistency**
**Severity:** MEDIUM  
**Location:** `functions/sendSms`, `functions/sendOtp`, `functions/sendBulkSms`  
**Issue:**
- sendSms resolves AT_ENVIRONMENT to sandbox/production
- sendOtp has same logic
- sendBulkSms may use different endpoint selection
- No validation that environment matches secrets

**Impact:** SMS may send to wrong API endpoint (test vs production)

---

### 18. **BulkSmsPage "Recipient Count" Estimate Requires Count-Only Campaign**
**Severity:** MEDIUM  
**Location:** `components/admin/comms/BulkSmsPage` (line ~110)  
**Issue:**
- getRecipientCount() creates a campaign with message=' '
- This pollutes SmsCampaign history with dummy records
- Should use a separate lightweight query function

**Impact:** Data pollution, misleading campaign history

---

### 19. **Individual User Search in BulkSmsPage Not Scoped to County**
**Severity:** HIGH  
**Location:** `components/admin/comms/BulkSmsPage` (line ~130-140)  
**Issue:**
- County admins can search and select riders from OTHER counties
- Filter in BulkSmsPage: `if (!query.trim()) return;`
- Search queries all users globally, not filtered by countyScope

**Impact:** SECURITY - County scope bypass, cross-county SMS possible

---

### 20. **No Deduplication in Bulk Recipient Lists**
**Severity:** MEDIUM  
**Location:** `functions/createSmsCampaign`  
**Issue:**
- Recipient lists may contain duplicates if filters overlap
- E.g., rider in multiple stages, groups, wards
- No deduplication before sending

**Impact:** Users receive duplicate SMS

---

### 21. **CampaignsPage Doesn't Show Campaign Recipients/Details**
**Severity:** MEDIUM  
**Location:** `components/admin/comms/CampaignsPage`  
**Issue:**
- Displays campaign summary but not recipient breakdown
- Cannot see which riders were targeted
- No detail view for campaign

**Impact:** Limited visibility into campaign execution

---

### 22. **SMS Status Mapping Incomplete in SmsLogsPage**
**Severity:** LOW  
**Location:** `components/admin/comms/SmsLogsPage`  
**Issue:**
- Status color mapping may not cover all possible statuses
- SmsLog allows: queued, sent, delivered, failed
- No visual distinction for 'delivered' status

**Impact:** UI clarity issue

---

### 23. **No Validation of Phone Number Format in SendSmsModal**
**Severity:** LOW  
**Location:** `components/admin/comms/SendSmsModal`  
**Issue:**
- Accepts any userPhone without validation
- Should be E.164 format (+254...)
- No prefix cleanup

**Impact:** Invalid SMS attempts, delivery failures

---

### 24. **templateKey Not Passed from SendSmsModal**
**Severity:** MEDIUM  
**Location:** `components/admin/comms/SendSmsModal`  
**Issue:**
- Mode='template' loads template but doesn't pass template_key to createSmsCampaign
- Should include templateKey in campaign for audit purposes

**Impact:** Cannot trace which template was used for campaign

---

## IMPLEMENTATION PLAN VIOLATIONS

| Phase | Requirement | Current Status | Gap |
|-------|-------------|----------------|-----|
| Communications | Direct SMS from user profile | ❌ | Creates campaign instead of direct send |
| Communications | SMS logs visible in user profile | ❌ | Tab missing entirely |
| Communications | County-scoped SMS delivery | ❌ | No county filtering in bulk SMS |
| Communications | SMS logs searchable by phone | ❌ | No phone search filter |
| Communications | Bulk SMS tracking via Campaigns | ⚠️ | Partial - missing error handling |
| Communications | Transactional SMS (OTP, etc.) | ✅ | sendSms/sendOtp working |

---

## RECOMMENDED FIXES (Priority Order)

1. **CRITICAL:** Add SMS Logs tab to UserProfileDrawer with user_id filtering
2. **CRITICAL:** Fix SendSmsModal to use sendSms (not createSmsCampaign) for direct sends
3. **CRITICAL:** Implement county scoping in BulkSmsPage individual user search
4. **CRITICAL:** Scope County Communications page to county_id
5. **HIGH:** Add user_id and recipient_phone tracking to SmsCampaign
6. **HIGH:** Implement county filtering in SmsLogsPage
7. **HIGH:** Add phone number search filter to SmsLogsPage
8. **MEDIUM:** Add campaign detail view in CampaignsPage
9. **MEDIUM:** Implement retry logic in sendBulkSms
10. **MEDIUM:** Add recipe count query function (not campaign creation)
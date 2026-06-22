# IDAnalyzer API v2 Reference

For future integration with IDAnalyzer provider in BodaSure KYC flow.

## Base URL
`https://api2.idanalyzer.com`

## Authentication
- Header: `X-API-KEY: <your-api-key>`

## Key Endpoints

### 1. Document Verification
**POST** `/v5/verify_document`

Verifies identity documents (ID cards, passports, etc.)

#### Request Headers
```
X-API-KEY: <api-key>
Content-Type: application/json
```

#### Request Body
```json
{
  "document_primary": {
    "fetch_digital_seal": true,
    "country": "KE",
    "document_type": "national_id"
  },
  "document_primary_image": "base64_encoded_image"
}
```

#### Response
```json
{
  "id": "verification_id",
  "status": "success|failure|review",
  "result": {
    "document": {
      "country": "KE",
      "type": "national_id",
      "number": "xxx",
      "mrz": {}
    },
    "face": {
      "confidence": 0.95
    }
  }
}
```

### 2. Liveness Check
**POST** `/v5/verify_liveness`

Verifies biometric liveness (selfie validation)

#### Request Body
```json
{
  "liveness_images": ["base64_image_1", "base64_image_2"],
  "challenge_type": "passive"
}
```

### 3. Face Match
**POST** `/v5/verify_facematch`

Matches face from identity document with selfie.

#### Request Body
```json
{
  "document_image": "base64_id_photo",
  "selfie_image": "base64_selfie_photo"
}
```

## Status Codes
- `200`: Request accepted
- `400`: Bad request
- `401`: Unauthorized (invalid API key)
- `429`: Rate limited
- `500`: Server error

## Integration Notes
- Implement with processKycDecision provider pattern
- Cache verification results in KycDocument.provider_reference field
- Handle async verification (some results may be marked for review)
- Respect rate limits (typically 100-1000 requests/month based on plan)
- Use provider_name = 'idanalyzer' in KycDocument records
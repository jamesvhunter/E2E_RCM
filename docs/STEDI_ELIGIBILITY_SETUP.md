# Stedi Real-Time Eligibility Check Setup Guide

This guide covers the implementation of Stedi's real-time eligibility check (270/271 EDI transactions) in the E2E RCM application.

## Overview

The Stedi eligibility integration allows you to:
- ✅ Check patient insurance eligibility in real-time
- ✅ Retrieve comprehensive benefit information (copays, deductibles, OOP max, coinsurance)
- ✅ Verify coverage status and effective dates
- ✅ Store eligibility check history for auditing
- ✅ Support mock data for development and testing

## Architecture

```
┌──────────────┐
│   Patient    │
│   Intake     │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│   tRPC       │────▶│   Stedi      │
│  Eligibility │     │   Client     │
│   Router     │◀────│              │
└──────┬───────┘     └──────┬───────┘
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│   Supabase   │     │   Stedi      │
│   Database   │     │     API      │
└──────────────┘     └──────────────┘
```

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local` file:

```bash
# Stedi API Key (required)
# Get yours at: https://www.stedi.com/app/settings/api-keys
STEDI_API_KEY=your-actual-stedi-api-key

# For development/testing, use Stedi's test API key:
# STEDI_API_KEY=test_yourTestKeyHere
```

### 2. Database Migration

Run the database migration to add the enhanced eligibility check columns:

```bash
npm run db:push
```

This will apply the migration in `supabase/migrations/00003_enhance_eligibility_checks.sql` which adds:
- `plan_name`, `group_number` - Plan information
- `effective_date`, `termination_date` - Coverage dates
- `subscriber_name` - For verification
- `deductible_amount`, `coinsurance_percent`, `oop_max_amount` - Full benefit amounts
- `coverage_level` - Individual (IND) or Family (FAM)

### 3. Seed Payers Table

Fetch and seed payers from Stedi's network directory:

```bash
# Install tsx if not already installed
npm install --save-dev tsx

# Run the payer seeding script
npm run seed:payers
```

This will:
- Fetch all payers from Stedi API
- Filter to only payers supporting eligibility checks
- Insert/update payers in your database with `stedi_payer_id`

### 4. Install Dependencies

All required dependencies are already in `package.json`. If you need to reinstall:

```bash
npm install
```

## Usage

### Making an Eligibility Check

Use the tRPC eligibility router:

```typescript
import { trpc } from "@/lib/trpc/client";

const result = await trpc.eligibility.check.mutate({
  coverageId: "uuid-of-coverage-policy",
  providerId: "uuid-of-provider",
  dateOfService: "2024-12-15", // YYYY-MM-DD format
});

console.log(result);
// {
//   eligibilityCheckId: "...",
//   status: "completed",
//   isActive: true,
//   planName: "Gold PPO Plan",
//   copayAmount: 25,
//   deductibleAmount: 1500,
//   deductibleRemaining: 800,
//   ...
// }
```

### Retrieving Eligibility History

```typescript
const history = await trpc.eligibility.getHistory.query({
  coverageId: "uuid-of-coverage-policy",
  limit: 10,
});
```

### Getting Latest Eligibility

```typescript
const latest = await trpc.eligibility.getLatest.query({
  coverageId: "uuid-of-coverage-policy",
});
```

## Mock Data for Testing

The system automatically uses mock data when:
1. `STEDI_API_KEY` is not set or is the placeholder value
2. `STEDI_API_KEY` starts with `test_`
3. Trading Partner Service ID (payer ID) is `"STEDI-TEST"`

### Mock Member ID Patterns

Use these member IDs to trigger specific mock responses:

| Member ID Pattern | Response |
|-------------------|----------|
| `TEST123456` | Active coverage with full benefits |
| `INACTIVE*` | Inactive/terminated coverage |
| `INVALID*` or `ERROR*` | Error response (invalid subscriber) |
| `FAM*` | Family coverage with individual + family benefits |
| `HDHP*` or `HSA*` | High-deductible health plan |

### Example Mock Usage

```typescript
// In development with mock mode enabled
const result = await trpc.eligibility.check.mutate({
  coverageId: "...",
  providerId: "...",
  dateOfService: "2024-12-15",
});

// If coverage has member_id = "TEST123456", returns mock active coverage
// If coverage has member_id = "INACTIVE123", returns mock inactive coverage
```

## Features

### Comprehensive Benefit Parsing

The system extracts the following from Stedi responses:

**Coverage Status:**
- Is active (statusCode = "1")
- Network status (in-network, out-of-network, mixed)

**Plan Information:**
- Plan name and group number
- Effective and termination dates
- Subscriber name verification

**Financial Benefits:**
- **Copay**: Office visit copayment amount
- **Deductible**: Total annual deductible and remaining amount
- **Coinsurance**: Percentage (e.g., 20%)
- **Out-of-Pocket Max**: Total OOP max and remaining amount
- **Coverage Level**: Individual (IND) or Family (FAM)

### Date Format Handling

The system automatically converts dates from various formats to Stedi's required `YYYYMMDD` format:

```typescript
import { formatDateForStedi } from "@/lib/stedi/utils";

formatDateForStedi("1980-01-15");  // "19800115" (ISO format)
formatDateForStedi("01/15/1980");  // "19800115" (US format)
formatDateForStedi("19800115");    // "19800115" (already formatted)
```

### Structured Logging

Development mode includes detailed formatted logging:

```
======================================================================
📤 STEDI ELIGIBILITY REQUEST
======================================================================
Control Number: ELG123456789
Payer ID:       CIGNA
Provider NPI:   1234567893
Member ID:      MEM123456
...
```

Production mode uses JSON logging for observability tools.

## API Response Structure

### Success Response

```typescript
{
  eligibilityCheckId: string;
  status: "completed";
  // Coverage Status
  isActive: boolean;
  networkStatus?: "in-network" | "out-of-network" | "mixed";

  // Plan Information
  planName?: string;
  groupNumber?: string;
  effectiveDate?: string;  // YYYY-MM-DD
  terminationDate?: string;  // YYYY-MM-DD
  subscriberName?: string;

  // Benefits
  copayAmount?: number;
  deductibleAmount?: number;
  deductibleRemaining?: number;
  coinsurancePercent?: number;  // e.g., 20 for 20%
  oopMaxAmount?: number;
  oopMaxRemaining?: number;
  coverageLevel?: "IND" | "FAM";

  // Raw Data
  benefitsSummary: array;
  planStatus: array;
}
```

### Error Response

```typescript
{
  eligibilityCheckId: string;
  status: "error";
  error: string;
  isActive: null;
  // All other fields are null
}
```

## Integration Points

The eligibility check is automatically triggered in:

1. **Patient Intake Flow** ([src/server/routers/intake.ts:310-388](src/server/routers/intake.ts#L310-L388))
   - Runs after patient creates coverage policy
   - Stores results in `eligibility_checks` table

2. **Manual Staff Checks**
   - Via tRPC `eligibility.check` procedure
   - Can be triggered from any frontend component

## Database Schema

The `eligibility_checks` table stores:

```sql
CREATE TABLE eligibility_checks (
  id UUID PRIMARY KEY,
  coverage_id UUID REFERENCES coverage_policies,
  provider_id UUID REFERENCES providers,
  date_of_service DATE,

  -- Request/Response
  request_payload JSONB,
  response_payload JSONB,

  -- Parsed Status
  is_active BOOLEAN,
  network_status TEXT,

  -- Parsed Plan Info
  plan_name TEXT,
  group_number TEXT,
  effective_date DATE,
  termination_date DATE,
  subscriber_name TEXT,

  -- Parsed Benefits
  copay_amount NUMERIC(10,2),
  deductible_amount NUMERIC(10,2),
  deductible_remaining NUMERIC(10,2),
  coinsurance_percent NUMERIC(5,2),
  oop_max_amount NUMERIC(10,2),
  oop_max_remaining NUMERIC(10,2),
  coverage_level TEXT,

  -- Raw Benefits
  benefits_summary JSONB,

  -- Metadata
  checked_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Troubleshooting

### Issue: "STEDI_API_KEY is not set"

**Solution**: Add your Stedi API key to `.env.local`. For development, you can use a test key starting with `test_`.

### Issue: Payers table is empty

**Solution**: Run the payer seeding script:

```bash
npm run seed:payers
```

### Issue: "Invalid trading partner service ID"

**Solution**: The payer's `stedi_payer_id` must match a valid payer ID from Stedi's network. Check the payers table or re-run the seed script.

### Issue: Date format errors

**Solution**: Dates are automatically converted. Ensure input dates are in one of these formats:
- `YYYY-MM-DD` (ISO format, recommended)
- `MM/DD/YYYY` (US format)
- `YYYYMMDD` (Stedi format)

### Issue: Mock data not working

**Solution**: Check that one of these conditions is true:
- `STEDI_API_KEY` starts with `test_`
- Trading partner service ID is `"STEDI-TEST"`
- `STEDI_API_KEY` is missing or placeholder

## Testing

Run the utility function tests:

```bash
npm test src/lib/stedi/utils.test.ts
```

## Additional Resources

- [Stedi Eligibility API Documentation](https://www.stedi.com/docs/healthcare/api-reference/post-healthcare-eligibility)
- [Stedi Real-Time Eligibility Guide](https://www.stedi.com/docs/healthcare/send-eligibility-checks)
- [Stedi Trading Partner Network](https://www.stedi.com/healthcare/network)
- [Stedi Mock Requests](https://www.stedi.com/docs/api-reference/healthcare/mock-requests-eligibility-checks)

## Support

For questions or issues:
1. Check the [Stedi Documentation](https://www.stedi.com/docs)
2. Review logs in development mode (formatted output) or production mode (JSON)
3. Verify payer IDs match Stedi's network directory

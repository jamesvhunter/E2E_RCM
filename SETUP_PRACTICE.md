# Practice Setup Guide

This guide will help you set up providers and locations to enable appointment scheduling.

## Quick Start

### 1. Create Default Organization

First, seed the default organization by making a POST request:

```bash
curl -X POST http://localhost:3000/api/admin/seed-org
```

Or visit in your browser and use the Network tab to make a POST request, or use a tool like Postman.

Alternatively, you can run the SQL directly:

```bash
psql -h localhost -U postgres -d postgres -f supabase/seed_organization.sql
```

### 2. Add Providers

1. Navigate to **Dashboard → Practice Setup**
2. Click on the **Providers** tab
3. Click **Add Provider**
4. Fill in the form:
   - **First Name**: e.g., Sarah
   - **Last Name**: e.g., Johnson
   - **NPI**: 10-digit National Provider Identifier (e.g., 1234567890)
   - **Credentials**: e.g., MD, DO, NP, PA
   - **Taxonomy Code**: Healthcare Provider Taxonomy Code (optional)
   - **Check boxes** for Billing Provider and/or Rendering Provider
5. Click **Add Provider**

**Finding NPIs**: Visit [npiregistry.cms.hhs.gov](https://npiregistry.cms.hhs.gov) to look up real NPIs or use test NPIs for development.

### 3. Add Locations

1. On the **Practice Setup** page, click the **Locations** tab
2. Click **Add Location**
3. Fill in the form:
   - **Location Name**: e.g., Main Clinic
   - **Address**: Full street address
   - **City, State, ZIP**: Location details
   - **Place of Service Code**: Defaults to "11 - Office"
4. Click **Add Location**

### 4. Create Appointments

Once you have at least one provider and one location, you can:

1. Navigate to **Dashboard → Schedules**
2. Click **New visit** (purple button, top right)
3. Select a patient, provider, location, date, and time
4. Click **Schedule Visit**

## Common Place of Service Codes

- **11** - Office
- **21** - Inpatient Hospital
- **22** - Outpatient Hospital
- **23** - Emergency Room
- **24** - Ambulatory Surgical Center
- **49** - Independent Clinic

## Troubleshooting

### "Please create an organization first" error

Run the seed organization command:
```bash
curl -X POST http://localhost:3000/api/admin/seed-org
```

### No providers or locations showing in appointment form

Make sure you've added at least one provider and one location through the Practice Setup page.

### NPI validation error

NPIs must be exactly 10 digits. Use format: 1234567890 (no spaces or dashes).

## Next Steps

After setting up providers and locations, you can:
- **Schedule appointments** in the Schedules view
- **Create encounters** from appointments
- **Generate charges** that will appear in the ledger
- **Test the full patient intake flow** with eligibility verification

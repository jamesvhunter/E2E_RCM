-- Seed default organization if none exists
-- Run this manually: psql -h localhost -U postgres -d postgres -f supabase/seed_organization.sql

INSERT INTO organizations (
  name,
  tax_id,
  npi,
  address_line_1,
  address_line_2,
  city,
  state,
  zip_code,
  phone
)
SELECT
  'Freed RCM Medical Group',
  '12-3456789',
  '1234567890',
  '123 Healthcare Blvd',
  'Suite 100',
  'San Francisco',
  'CA',
  '94102',
  '(415) 555-0100'
WHERE NOT EXISTS (
  SELECT 1 FROM organizations LIMIT 1
);

-- Make organization fields optional
-- Allow all fields to be NULL for flexibility in the setup flow

ALTER TABLE organizations
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN address_line1 DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN state DROP NOT NULL,
  ALTER COLUMN zip_code DROP NOT NULL;

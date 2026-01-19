-- Seed data for ClaimFlow development
-- Includes sample organization, providers, locations, and payers

-- =============================================================================
-- ORGANIZATION & PRACTICE DATA
-- =============================================================================

INSERT INTO organizations (id, name, tax_id, npi, address_line1, city, state, zip_code, phone) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ClaimFlow Medical Group', '12-3456789', '1234567890', '123 Healthcare Blvd, Suite 100', 'San Francisco', 'CA', '94102', '415-555-0100');

INSERT INTO providers (id, organization_id, npi, first_name, last_name, credentials, taxonomy_code, is_billing_provider, is_rendering_provider) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', '1234567890', 'Sarah', 'Johnson', 'MD', '207Q00000X', true, true),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', '0987654321', 'Michael', 'Chen', 'MD', '207Q00000X', false, true),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', '1122334455', 'Emily', 'Williams', 'NP', '363L00000X', false, true);

INSERT INTO locations (id, organization_id, name, address_line1, city, state, zip_code, place_of_service_code, is_primary) VALUES
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000001', 'Main Clinic', '123 Healthcare Blvd, Suite 100', 'San Francisco', 'CA', '94102', '11', true),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000001', 'Downtown Office', '456 Market Street, Floor 3', 'San Francisco', 'CA', '94105', '11', false);

-- =============================================================================
-- SAMPLE PAYERS
-- =============================================================================

INSERT INTO payers (id, stedi_payer_id, name, payer_type, is_active) VALUES
  ('00000000-0000-0000-0003-000000000001', 'BCBSCA', 'Blue Cross Blue Shield of California', 'commercial', true),
  ('00000000-0000-0000-0003-000000000002', 'AETNA', 'Aetna', 'commercial', true),
  ('00000000-0000-0000-0003-000000000003', 'UNITED', 'UnitedHealthcare', 'commercial', true),
  ('00000000-0000-0000-0003-000000000004', 'CIGNA', 'Cigna', 'commercial', true),
  ('00000000-0000-0000-0003-000000000005', 'SELFPAY', 'Self Pay', 'self_pay', true);

-- =============================================================================
-- SAMPLE PATIENTS
-- =============================================================================

INSERT INTO patients (id, first_name, last_name, dob, sex, address_line1, city, state, zip_code, phone, email) VALUES
  ('00000000-0000-0000-0004-000000000001', 'John', 'Smith', '1985-03-15', 'M', '789 Patient Lane', 'San Francisco', 'CA', '94110', '415-555-1234', 'john.smith@email.com'),
  ('00000000-0000-0000-0004-000000000002', 'Maria', 'Garcia', '1990-07-22', 'F', '321 Wellness Way', 'San Francisco', 'CA', '94112', '415-555-5678', 'maria.garcia@email.com'),
  ('00000000-0000-0000-0004-000000000003', 'Robert', 'Lee', '1978-11-08', 'M', '555 Health Street', 'Oakland', 'CA', '94601', '510-555-9012', 'robert.lee@email.com');

-- =============================================================================
-- SAMPLE COVERAGE
-- =============================================================================

INSERT INTO coverage_policies (id, patient_id, payer_id, plan_type, group_number, member_id, effective_from, status) VALUES
  ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0003-000000000001', 'PPO', 'GRP12345', 'MEM001234567', '2024-01-01', 'verified'),
  ('00000000-0000-0000-0005-000000000002', '00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0003-000000000002', 'HMO', 'GRP98765', 'MEM007654321', '2024-01-01', 'verified'),
  ('00000000-0000-0000-0005-000000000003', '00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0003-000000000003', 'PPO', 'GRP55555', 'MEM005555555', '2024-01-01', 'pending_verification');

-- =============================================================================
-- SAMPLE ENCOUNTER & CHARGES
-- =============================================================================

INSERT INTO encounters (id, patient_id, coverage_id, provider_id, location_id, start_time, end_time, place_of_service, chief_complaint, assessment) VALUES
  ('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001', '2025-01-15 09:00:00-08', '2025-01-15 09:30:00-08', '11', 'Annual wellness visit', 'Patient in good health, routine preventive care provided.');

INSERT INTO charge_sets (id, encounter_id, version, status, ai_confidence, finalized_at) VALUES
  ('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0006-000000000001', 1, 'finalized', 0.95, '2025-01-15 10:00:00-08');

INSERT INTO service_lines (id, charge_set_id, line_number, cpt_code, modifiers, dx_codes, units, charge_amount, dos_from, dos_to, place_of_service, ai_suggested, ai_confidence) VALUES
  ('00000000-0000-0000-0008-000000000001', '00000000-0000-0000-0007-000000000001', 1, '99395', '{}', '{"Z00.00"}', 1, 275.00, '2025-01-15', '2025-01-15', '11', true, 0.95),
  ('00000000-0000-0000-0008-000000000002', '00000000-0000-0000-0007-000000000001', 2, '90471', '{}', '{"Z23"}', 1, 25.00, '2025-01-15', '2025-01-15', '11', true, 0.92);

-- Post charges to ledger
INSERT INTO ledger_entries (patient_id, encounter_id, service_line_id, entry_type, amount, description) VALUES
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0008-000000000001', 'charge', 275.00, 'Service: 99395'),
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0008-000000000002', 'charge', 25.00, 'Service: 90471');

-- =============================================================================
-- SAMPLE WORK ITEMS
-- =============================================================================

INSERT INTO work_items (id, item_type, status, priority, title, description, patient_id, coverage_id) VALUES
  ('00000000-0000-0000-0009-000000000001', 'coverage_incomplete', 'pending', 7, 'Missing subscriber information', 'Coverage policy is missing subscriber relationship details', '00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0005-000000000003');

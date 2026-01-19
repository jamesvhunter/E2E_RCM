-- ClaimFlow Initial Database Schema
-- Creates all tables for the AI-native EHR & Practice Management System

-- =============================================================================
-- ENUMS (State Machines)
-- =============================================================================

CREATE TYPE coverage_status AS ENUM (
  'incomplete',
  'pending_verification',
  'verified',
  'inactive'
);

CREATE TYPE charge_set_status AS ENUM (
  'draft',
  'coder_review',
  'finalized',
  'void'
);

CREATE TYPE claim_status AS ENUM (
  'ready',
  'submitted',
  'ack_accepted',
  'ack_rejected',
  'adjudicated',
  'closed'
);

CREATE TYPE enrollment_status AS ENUM (
  'draft',
  'stedi_action_required',
  'provider_action_required',
  'provisioning',
  'live',
  'rejected',
  'canceled'
);

CREATE TYPE ledger_entry_type AS ENUM (
  'charge',
  'patient_payment',
  'insurance_payment',
  'adjustment',
  'refund',
  'writeoff'
);

CREATE TYPE work_item_type AS ENUM (
  'coverage_incomplete',
  'eligibility_failed',
  'charge_review',
  'claim_rejected',
  'remit_unmatched',
  'denial_review'
);

CREATE TYPE work_item_status AS ENUM (
  'pending',
  'assigned',
  'in_progress',
  'completed',
  'escalated'
);

-- =============================================================================
-- PRACTICE MASTER DATA
-- =============================================================================

-- Organizations (billing entities)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tax_id TEXT,
  npi TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Providers (physicians, NPs, etc.)
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  npi TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  credentials TEXT,
  taxonomy_code TEXT,
  is_billing_provider BOOLEAN NOT NULL DEFAULT false,
  is_rendering_provider BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_providers_npi ON providers(npi);
CREATE INDEX idx_providers_organization ON providers(organization_id);

-- Locations / Service Facilities
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  place_of_service_code TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_organization ON locations(organization_id);

-- =============================================================================
-- PAYERS
-- =============================================================================

CREATE TABLE payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stedi_payer_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  payer_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payers_stedi_id ON payers(stedi_payer_id);
CREATE INDEX idx_payers_name ON payers(name);

-- =============================================================================
-- PATIENTS & COVERAGE
-- =============================================================================

-- Patients
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  dob DATE NOT NULL,
  sex TEXT NOT NULL,
  ssn_last_four TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_patients_dob ON patients(dob);

-- Guarantors
CREATE TABLE guarantors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guarantors_patient ON guarantors(patient_id);

-- Coverage Policies
CREATE TABLE coverage_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES payers(id),
  plan_type TEXT,
  group_number TEXT,
  member_id TEXT NOT NULL,
  subscriber_id UUID,
  priority INTEGER NOT NULL DEFAULT 1,
  effective_from DATE NOT NULL,
  effective_to DATE,
  status coverage_status NOT NULL DEFAULT 'incomplete',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coverage_patient ON coverage_policies(patient_id);
CREATE INDEX idx_coverage_payer ON coverage_policies(payer_id);
CREATE INDEX idx_coverage_member_id ON coverage_policies(member_id);

-- Subscribers (when patient is not the subscriber)
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coverage_id UUID NOT NULL REFERENCES coverage_policies(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  group_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob DATE NOT NULL,
  relationship_to_patient TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscribers_coverage ON subscribers(coverage_id);

-- Add foreign key for subscriber_id
ALTER TABLE coverage_policies
ADD CONSTRAINT fk_coverage_subscriber
FOREIGN KEY (subscriber_id) REFERENCES subscribers(id);

-- Eligibility Checks
CREATE TABLE eligibility_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coverage_id UUID NOT NULL REFERENCES coverage_policies(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id),
  date_of_service DATE NOT NULL,
  request_payload JSONB NOT NULL,
  response_payload JSONB,
  is_active BOOLEAN,
  network_status TEXT,
  copay_amount NUMERIC(10, 2),
  deductible_remaining NUMERIC(10, 2),
  oop_max_remaining NUMERIC(10, 2),
  benefits_summary JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eligibility_coverage ON eligibility_checks(coverage_id);
CREATE INDEX idx_eligibility_checked_at ON eligibility_checks(checked_at DESC);

-- =============================================================================
-- ENCOUNTERS & CHARGE CAPTURE
-- =============================================================================

-- Encounters
CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  coverage_id UUID REFERENCES coverage_policies(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  place_of_service TEXT NOT NULL,
  chief_complaint TEXT,
  assessment TEXT,
  plan TEXT,
  notes TEXT,
  is_self_pay BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_encounters_patient ON encounters(patient_id);
CREATE INDEX idx_encounters_provider ON encounters(provider_id);
CREATE INDEX idx_encounters_start ON encounters(start_time DESC);

-- Charge Sets
CREATE TABLE charge_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  version INTEGER NOT NULL DEFAULT 1,
  status charge_set_status NOT NULL DEFAULT 'draft',
  ai_confidence NUMERIC(3, 2),
  ai_rationale TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(encounter_id, version)
);

CREATE INDEX idx_charge_sets_encounter ON charge_sets(encounter_id);
CREATE INDEX idx_charge_sets_status ON charge_sets(status);

-- Service Lines
CREATE TABLE service_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_set_id UUID NOT NULL REFERENCES charge_sets(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  cpt_code TEXT NOT NULL,
  modifiers TEXT[] NOT NULL DEFAULT '{}',
  dx_codes TEXT[] NOT NULL DEFAULT '{}',
  units INTEGER NOT NULL DEFAULT 1,
  charge_amount NUMERIC(10, 2) NOT NULL,
  dos_from DATE NOT NULL,
  dos_to DATE NOT NULL,
  place_of_service TEXT NOT NULL,
  provider_control_number TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  ai_suggested BOOLEAN NOT NULL DEFAULT false,
  ai_confidence NUMERIC(3, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(charge_set_id, line_number)
);

CREATE INDEX idx_service_lines_charge_set ON service_lines(charge_set_id);
CREATE INDEX idx_service_lines_cpt ON service_lines(cpt_code);

-- =============================================================================
-- CLAIMS & RESPONSES
-- =============================================================================

-- Claims
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  charge_set_id UUID NOT NULL REFERENCES charge_sets(id),
  patient_control_number TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  claim_version INTEGER NOT NULL DEFAULT 1,
  parent_claim_id UUID REFERENCES claims(id),
  status claim_status NOT NULL DEFAULT 'ready',
  total_charge_amount NUMERIC(10, 2) NOT NULL,
  stedi_transaction_id TEXT,
  stedi_correlation_id TEXT,
  submitted_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  adjudicated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(encounter_id, claim_version)
);

CREATE INDEX idx_claims_encounter ON claims(encounter_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_patient_control_number ON claims(patient_control_number);
CREATE INDEX idx_claims_stedi_txn ON claims(stedi_transaction_id);

-- Claim Responses (277CA, 835)
CREATE TABLE claim_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id),
  response_type TEXT NOT NULL,
  stedi_transaction_id TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  parsed_data JSONB,
  status_code TEXT,
  status_description TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claim_responses_claim ON claim_responses(claim_id);
CREATE INDEX idx_claim_responses_stedi_txn ON claim_responses(stedi_transaction_id);

-- =============================================================================
-- LEDGER (Event-Sourced Patient Accounting)
-- =============================================================================

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  encounter_id UUID REFERENCES encounters(id),
  service_line_id UUID REFERENCES service_lines(id),
  claim_id UUID REFERENCES claims(id),
  claim_response_id UUID REFERENCES claim_responses(id),
  entry_type ledger_entry_type NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  carc_code TEXT,
  rarc_code TEXT,
  adjustment_group TEXT,
  reference_number TEXT,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_patient ON ledger_entries(patient_id);
CREATE INDEX idx_ledger_encounter ON ledger_entries(encounter_id);
CREATE INDEX idx_ledger_claim ON ledger_entries(claim_id);
CREATE INDEX idx_ledger_type ON ledger_entries(entry_type);
CREATE INDEX idx_ledger_created ON ledger_entries(created_at);

-- Patient Balance View (computed from ledger entries)
CREATE VIEW patient_balances AS
SELECT
  patient_id,
  SUM(CASE WHEN entry_type = 'charge' AND voided_at IS NULL THEN amount ELSE 0 END) AS total_charges,
  SUM(CASE WHEN entry_type = 'insurance_payment' AND voided_at IS NULL THEN amount ELSE 0 END) AS insurance_payments,
  SUM(CASE WHEN entry_type = 'patient_payment' AND voided_at IS NULL THEN amount ELSE 0 END) AS patient_payments,
  SUM(CASE WHEN entry_type = 'adjustment' AND voided_at IS NULL THEN amount ELSE 0 END) AS adjustments,
  SUM(CASE WHEN entry_type = 'writeoff' AND voided_at IS NULL THEN amount ELSE 0 END) AS writeoffs,
  SUM(CASE WHEN entry_type = 'refund' AND voided_at IS NULL THEN amount ELSE 0 END) AS refunds,
  -- Insurance balance: what we expect to receive from payers
  SUM(CASE WHEN entry_type = 'charge' AND voided_at IS NULL THEN amount ELSE 0 END)
    - SUM(CASE WHEN entry_type = 'insurance_payment' AND voided_at IS NULL THEN amount ELSE 0 END)
    - SUM(CASE WHEN entry_type = 'adjustment' AND voided_at IS NULL THEN amount ELSE 0 END) AS insurance_balance,
  -- Patient balance: what the patient owes
  SUM(CASE WHEN entry_type = 'charge' AND voided_at IS NULL THEN amount ELSE 0 END)
    - SUM(CASE WHEN entry_type = 'insurance_payment' AND voided_at IS NULL THEN amount ELSE 0 END)
    - SUM(CASE WHEN entry_type = 'patient_payment' AND voided_at IS NULL THEN amount ELSE 0 END)
    - SUM(CASE WHEN entry_type = 'adjustment' AND voided_at IS NULL THEN amount ELSE 0 END)
    - SUM(CASE WHEN entry_type = 'writeoff' AND voided_at IS NULL THEN amount ELSE 0 END)
    + SUM(CASE WHEN entry_type = 'refund' AND voided_at IS NULL THEN amount ELSE 0 END) AS patient_balance
FROM ledger_entries
GROUP BY patient_id;

-- =============================================================================
-- WORK QUEUES (Operations)
-- =============================================================================

CREATE TABLE work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type work_item_type NOT NULL,
  status work_item_status NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 5,
  title TEXT NOT NULL,
  description TEXT,
  patient_id UUID REFERENCES patients(id),
  encounter_id UUID REFERENCES encounters(id),
  claim_id UUID REFERENCES claims(id),
  coverage_id UUID REFERENCES coverage_policies(id),
  assigned_to TEXT,
  assigned_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_work_items_type ON work_items(item_type);
CREATE INDEX idx_work_items_status ON work_items(status);
CREATE INDEX idx_work_items_priority ON work_items(priority DESC);
CREATE INDEX idx_work_items_assigned ON work_items(assigned_to);

-- =============================================================================
-- STEDI WEBHOOK IDEMPOTENCY
-- =============================================================================

CREATE TABLE processed_stedi_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stedi_events_txn ON processed_stedi_events(transaction_id);

-- =============================================================================
-- AUDIT LOG (Append-Only)
-- =============================================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- =============================================================================
-- TRIGGERS FOR updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payers_updated_at
  BEFORE UPDATE ON payers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_guarantors_updated_at
  BEFORE UPDATE ON guarantors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_coverage_policies_updated_at
  BEFORE UPDATE ON coverage_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON subscribers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_encounters_updated_at
  BEFORE UPDATE ON encounters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_charge_sets_updated_at
  BEFORE UPDATE ON charge_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_service_lines_updated_at
  BEFORE UPDATE ON service_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_work_items_updated_at
  BEFORE UPDATE ON work_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

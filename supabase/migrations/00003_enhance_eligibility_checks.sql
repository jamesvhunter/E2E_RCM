-- Add additional columns to eligibility_checks table for comprehensive benefit parsing
-- Migration: Enhance eligibility checks with full benefit data

-- Add new columns for plan information
ALTER TABLE eligibility_checks
  ADD COLUMN IF NOT EXISTS plan_name TEXT,
  ADD COLUMN IF NOT EXISTS group_number TEXT,
  ADD COLUMN IF NOT EXISTS effective_date DATE,
  ADD COLUMN IF NOT EXISTS termination_date DATE,
  ADD COLUMN IF NOT EXISTS subscriber_name TEXT;

-- Add new columns for comprehensive benefit amounts
ALTER TABLE eligibility_checks
  ADD COLUMN IF NOT EXISTS deductible_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS coinsurance_percent NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS oop_max_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS coverage_level TEXT;

-- Add index for efficient querying by date ranges
CREATE INDEX IF NOT EXISTS idx_eligibility_checks_effective_date
  ON eligibility_checks(effective_date);

CREATE INDEX IF NOT EXISTS idx_eligibility_checks_termination_date
  ON eligibility_checks(termination_date);

-- Add comment to table
COMMENT ON TABLE eligibility_checks IS 'Stores real-time eligibility check results from Stedi API with comprehensive benefit parsing';

-- Add comments to new columns
COMMENT ON COLUMN eligibility_checks.plan_name IS 'Insurance plan name from payer response';
COMMENT ON COLUMN eligibility_checks.group_number IS 'Group number for employer-sponsored plans';
COMMENT ON COLUMN eligibility_checks.effective_date IS 'Coverage effective/begin date';
COMMENT ON COLUMN eligibility_checks.termination_date IS 'Coverage termination/end date';
COMMENT ON COLUMN eligibility_checks.subscriber_name IS 'Subscriber name from payer response for verification';
COMMENT ON COLUMN eligibility_checks.deductible_amount IS 'Total annual deductible amount';
COMMENT ON COLUMN eligibility_checks.coinsurance_percent IS 'Coinsurance percentage (e.g., 20 for 20%)';
COMMENT ON COLUMN eligibility_checks.oop_max_amount IS 'Total out-of-pocket maximum amount';
COMMENT ON COLUMN eligibility_checks.coverage_level IS 'Coverage level code (IND=Individual, FAM=Family)';

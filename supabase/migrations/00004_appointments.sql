-- =====================================================================
-- Appointments Table Migration
-- Creates comprehensive appointment scheduling system with eligibility
-- tracking and conflict detection
-- =====================================================================

-- Create appointment status enum
CREATE TYPE appointment_status AS ENUM (
  'scheduled',
  'confirmed',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);

-- Create appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id),
  location_id UUID NOT NULL REFERENCES locations(id),

  -- Scheduling information
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,

  -- Status and type
  status appointment_status NOT NULL DEFAULT 'scheduled',
  appointment_type TEXT, -- e.g., 'new_patient', 'follow_up', 'annual_physical'
  chief_complaint TEXT,
  notes TEXT,

  -- Intake tracking
  intake_token_id UUID REFERENCES intake_tokens(id),
  intake_completed_at TIMESTAMPTZ,

  -- Eligibility tracking
  eligibility_check_id UUID REFERENCES eligibility_checks(id),
  eligibility_verified_at TIMESTAMPTZ,
  eligibility_status TEXT CHECK (eligibility_status IN ('pending', 'verified', 'failed', 'not_required')),

  -- Encounter linkage (populated post-visit)
  encounter_id UUID REFERENCES encounters(id),

  -- Confirmation tracking
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT,

  -- Cancellation tracking
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT,
  cancellation_reason TEXT,

  -- Reminder tracking
  reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER NOT NULL DEFAULT 0,

  -- Audit fields
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- Indexes for Performance
-- =====================================================================

-- Patient and provider lookups
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_provider ON appointments(provider_id);
CREATE INDEX idx_appointments_location ON appointments(location_id);

-- Date and status filtering
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Combined indexes for common queries
CREATE INDEX idx_appointments_provider_date ON appointments(provider_id, appointment_date);

-- Eligibility status for workflow queries
CREATE INDEX idx_appointments_eligibility
  ON appointments(eligibility_status)
  WHERE status IN ('scheduled', 'confirmed');

-- Calendar view queries (active appointments only)
CREATE INDEX idx_appointments_calendar
  ON appointments(provider_id, appointment_date, start_time)
  WHERE status NOT IN ('cancelled', 'no_show', 'completed');

-- Foreign key indexes for joins
CREATE INDEX idx_appointments_intake_token ON appointments(intake_token_id);
CREATE INDEX idx_appointments_eligibility_check ON appointments(eligibility_check_id);
CREATE INDEX idx_appointments_encounter ON appointments(encounter_id);

-- =====================================================================
-- Triggers
-- =====================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================================
-- Functions
-- =====================================================================

-- Function to check for scheduling conflicts
CREATE OR REPLACE FUNCTION check_appointment_conflict(
  p_provider_id UUID,
  p_appointment_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_appointment_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check for overlapping appointments for the same provider
  SELECT COUNT(*) INTO conflict_count
  FROM appointments
  WHERE provider_id = p_provider_id
    AND appointment_date = p_appointment_date
    AND status NOT IN ('cancelled', 'no_show', 'completed')
    -- Exclude the appointment being edited (if updating)
    AND (id != p_appointment_id OR p_appointment_id IS NULL)
    -- Check for time overlap using PostgreSQL's OVERLAPS operator
    AND (start_time, end_time) OVERLAPS (p_start_time, p_end_time);

  -- Return TRUE if conflict exists, FALSE otherwise
  RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- Bidirectional Reference: Add appointment_id to intake_tokens
-- =====================================================================

ALTER TABLE intake_tokens
  ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id);

CREATE INDEX IF NOT EXISTS idx_intake_tokens_appointment
  ON intake_tokens(appointment_id);

-- =====================================================================
-- Comments for Documentation
-- =====================================================================

COMMENT ON TABLE appointments IS 'Scheduled patient appointments with eligibility tracking';
COMMENT ON COLUMN appointments.eligibility_status IS 'pending = not checked, verified = active coverage, failed = inactive/error, not_required = self-pay';
COMMENT ON COLUMN appointments.status IS 'Appointment lifecycle: scheduled → confirmed → arrived → in_progress → completed';
COMMENT ON FUNCTION check_appointment_conflict IS 'Checks for scheduling conflicts using time overlap detection';

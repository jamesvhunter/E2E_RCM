-- Intake Tokens for HIPAA-Safe Patient Intake
-- Tracks secure, time-limited intake links sent via SMS

CREATE TYPE intake_token_status AS ENUM (
  'pending',
  'completed',
  'expired',
  'cancelled'
);

CREATE TABLE intake_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  provider_id UUID REFERENCES providers(id),
  date_of_service DATE,
  status intake_token_status NOT NULL DEFAULT 'pending',
  patient_id UUID REFERENCES patients(id),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  sms_sent_at TIMESTAMPTZ,
  sms_delivery_status TEXT,
  twilio_message_sid TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_intake_tokens_token ON intake_tokens(token);
CREATE INDEX idx_intake_tokens_phone ON intake_tokens(phone);
CREATE INDEX idx_intake_tokens_status ON intake_tokens(status);
CREATE INDEX idx_intake_tokens_expires ON intake_tokens(expires_at);
CREATE INDEX idx_intake_tokens_patient ON intake_tokens(patient_id);

-- Trigger for updated_at
CREATE TRIGGER update_intake_tokens_updated_at
  BEFORE UPDATE ON intake_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to auto-expire tokens
CREATE OR REPLACE FUNCTION expire_intake_tokens()
RETURNS void AS $$
BEGIN
  UPDATE intake_tokens
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Rate limiting table for intake submissions
CREATE TABLE intake_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,  -- IP address or token
  identifier_type TEXT NOT NULL,  -- 'ip' or 'token'
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_identifier ON intake_rate_limits(identifier, identifier_type);
CREATE INDEX idx_rate_limits_window ON intake_rate_limits(window_start);

-- Cleanup old rate limit records (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM intake_rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- Intake Tokens Email Support Migration
-- Extends intake_tokens table to support dual-channel delivery (SMS + Email)
-- =====================================================================

-- Add email delivery fields
ALTER TABLE intake_tokens
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS delivery_channel TEXT DEFAULT 'sms',
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS resend_email_id TEXT;

-- Make phone nullable (required for SMS, optional for email)
ALTER TABLE intake_tokens
  ALTER COLUMN phone DROP NOT NULL;

-- Add constraint: delivery_channel must be 'sms' or 'email'
ALTER TABLE intake_tokens
  ADD CONSTRAINT intake_tokens_delivery_channel_check
  CHECK (delivery_channel IN ('sms', 'email'));

-- Add constraint: must have either phone (for SMS) or email (for email)
ALTER TABLE intake_tokens
  ADD CONSTRAINT intake_tokens_contact_check
  CHECK (
    (delivery_channel = 'sms' AND phone IS NOT NULL) OR
    (delivery_channel = 'email' AND email IS NOT NULL)
  );

-- =====================================================================
-- Indexes for Performance
-- =====================================================================

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_intake_tokens_email
  ON intake_tokens(email)
  WHERE email IS NOT NULL;

-- Index for delivery channel filtering
CREATE INDEX IF NOT EXISTS idx_intake_tokens_channel
  ON intake_tokens(delivery_channel);

-- Index for email delivery status tracking
CREATE INDEX IF NOT EXISTS idx_intake_tokens_email_status
  ON intake_tokens(email_delivery_status)
  WHERE email_delivery_status IS NOT NULL;

-- =====================================================================
-- Comments for Documentation
-- =====================================================================

COMMENT ON COLUMN intake_tokens.email IS 'Patient email address (required if delivery_channel = email)';
COMMENT ON COLUMN intake_tokens.delivery_channel IS 'Communication channel: sms or email';
COMMENT ON COLUMN intake_tokens.email_sent_at IS 'Timestamp when email was sent via Resend';
COMMENT ON COLUMN intake_tokens.email_delivery_status IS 'Email delivery status: sent, failed, delivered, bounced';
COMMENT ON COLUMN intake_tokens.resend_email_id IS 'Resend email ID for tracking and webhooks';

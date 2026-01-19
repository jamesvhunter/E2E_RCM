-- Insert a test payer for mock mode development
-- Run this in Supabase SQL editor or via supabase db execute

INSERT INTO payers (stedi_payer_id, name, payer_type, is_active)
VALUES ('STEDI-TEST', 'Test Payer (Mock Mode)', 'commercial', true)
ON CONFLICT (stedi_payer_id) DO UPDATE
SET name = EXCLUDED.name,
    payer_type = EXCLUDED.payer_type,
    is_active = EXCLUDED.is_active;

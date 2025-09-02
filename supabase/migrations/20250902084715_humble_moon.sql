/*
  # Create marketing and analytics tables

  1. New Tables
    - `marketing_campaigns`
      - `id` (serial, primary key)
      - `name` (text) - Campaign name
      - `type` (enum) - discount, bonus_days, referral_bonus
      - `value` (integer) - Discount percentage or bonus days
      - `code` (text, nullable, unique) - Promo code
      - `active` (boolean) - Whether campaign is active
      - `starts_at` (timestamp, nullable) - Campaign start time
      - `expires_at` (timestamp, nullable) - Campaign end time
      - `max_uses` (integer, nullable) - Maximum number of uses
      - `current_uses` (integer) - Current usage count
      - `target_audience` (text, nullable) - JSON for targeting rules
      - `created_at` (timestamp) - Creation time

    - `promo_code_usage`
      - `id` (serial, primary key)
      - `user_id` (integer) - Reference to users table
      - `campaign_id` (integer) - Reference to marketing_campaigns
      - `code_used` (text) - The actual code used
      - `discount_applied` (integer) - Discount percentage applied
      - `bonus_days_added` (integer) - Bonus days added
      - `used_at` (timestamp) - When code was used

  2. Security
    - Enable RLS on both tables
    - Add policies for reading campaign data
    - Add policies for tracking usage

  3. Sample Data
    - Create sample marketing campaigns
*/

-- Create campaign type enum
CREATE TYPE campaign_type AS ENUM ('discount', 'bonus_days', 'referral_bonus');

-- Create marketing campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type campaign_type NOT NULL,
  value INTEGER NOT NULL,
  code TEXT UNIQUE,
  active BOOLEAN DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  target_audience TEXT, -- JSON string for targeting rules
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create promo code usage tracking table
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  campaign_id INTEGER REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  code_used TEXT NOT NULL,
  discount_applied INTEGER DEFAULT 0,
  bonus_days_added INTEGER DEFAULT 0,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_code ON marketing_campaigns(code);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON marketing_campaigns(active);
CREATE INDEX IF NOT EXISTS idx_campaigns_expires_at ON marketing_campaigns(expires_at);
CREATE INDEX IF NOT EXISTS idx_promo_usage_user_id ON promo_code_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_campaign_id ON promo_code_usage(campaign_id);

-- Enable RLS
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Policies for marketing campaigns (public read for active campaigns)
CREATE POLICY "Anyone can read active campaigns"
  ON marketing_campaigns
  FOR SELECT
  USING (active = true);

CREATE POLICY "Service role can manage campaigns"
  ON marketing_campaigns
  FOR ALL
  TO service_role
  USING (true);

-- Policies for promo code usage
CREATE POLICY "Users can read own promo usage"
  ON promo_code_usage
  FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id FROM users WHERE telegram_id = (current_setting('app.current_user_telegram_id'))::bigint
  ));

CREATE POLICY "Service role can manage promo usage"
  ON promo_code_usage
  FOR ALL
  TO service_role
  USING (true);

-- Insert sample marketing campaigns
INSERT INTO marketing_campaigns (name, type, value, code, expires_at, max_uses) VALUES
  ('New Year Sale', 'discount', 30, 'NEWYEAR30', '2025-01-31 23:59:59', 1000),
  ('Welcome Bonus', 'bonus_days', 7, 'WELCOME7', NULL, NULL),
  ('Black Friday', 'discount', 50, 'BLACK50', '2025-11-30 23:59:59', 500),
  ('Referral Bonus', 'referral_bonus', 14, NULL, NULL, NULL);
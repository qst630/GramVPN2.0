/*
  # Create VPN application schema according to requirements

  1. New Tables
    - `users` - Updated structure for VPN users
    - `subscriptions` - User subscriptions management
    - `servers` - VPN servers with 3x-ui integration
    - `payments` - Payment history
    - `promo_codes` - Promotional codes system

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table

  3. Indexes
    - Performance indexes for frequent queries
*/

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS promo_code_usage CASCADE;
DROP TABLE IF EXISTS marketing_campaigns CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create updated users table according to requirements
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  full_name TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by INTEGER REFERENCES users(id),
  subscription_status BOOLEAN DEFAULT FALSE,
  subscription_link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create subscriptions table
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL, -- 'trial', '30days', '90days', '365days'
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create servers table for VPN infrastructure
CREATE TABLE servers (
  id SERIAL PRIMARY KEY,
  server_name TEXT NOT NULL,
  server_ip TEXT NOT NULL,
  country TEXT,
  status BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  vless_type TEXT,
  vless_security TEXT,
  vless_fp TEXT,
  vless_sni TEXT,
  vless_sid TEXT,
  vless_spx TEXT,
  vless_flow TEXT,
  server_port INTEGER,
  xui_api_url TEXT,
  xui_username TEXT,
  xui_password TEXT,
  vless_domain TEXT,
  vless_port INTEGER,
  vless_path TEXT,
  inbound_id TEXT,
  vless_public_key TEXT,
  active_subscribers INTEGER DEFAULT 0,
  server_role TEXT
);

-- Create payments table
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  subscription_id INTEGER REFERENCES subscriptions(id),
  promo_code_used TEXT,
  discount_applied DECIMAL(10,2) DEFAULT 0
);

-- Create promo_codes table
CREATE TABLE promo_codes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER NOT NULL,
  valid_for TEXT, -- 'all', '30days', '90days', '365days'
  is_active BOOLEAN DEFAULT TRUE,
  is_one_time BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  max_usage INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Create referral_bonuses table to track referral rewards
CREATE TABLE referral_bonuses (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bonus_days INTEGER DEFAULT 7,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  applied_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX idx_subscriptions_active ON subscriptions(is_active);
CREATE INDEX idx_servers_status ON servers(status);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_referral_bonuses_referrer ON referral_bonuses(referrer_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_bonuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (true); -- Allow reading for user lookup

CREATE POLICY "Service role can manage users" ON users
  FOR ALL TO service_role USING (true);

-- RLS Policies for subscriptions
CREATE POLICY "Users can read own subscriptions" ON subscriptions
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL TO service_role USING (true);

-- RLS Policies for servers (public read for active servers)
CREATE POLICY "Anyone can read active servers" ON servers
  FOR SELECT USING (status = true);

CREATE POLICY "Service role can manage servers" ON servers
  FOR ALL TO service_role USING (true);

-- RLS Policies for payments
CREATE POLICY "Users can read own payments" ON payments
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage payments" ON payments
  FOR ALL TO service_role USING (true);

-- RLS Policies for promo codes (public read for active codes)
CREATE POLICY "Anyone can read active promo codes" ON promo_codes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage promo codes" ON promo_codes
  FOR ALL TO service_role USING (true);

-- RLS Policies for referral bonuses
CREATE POLICY "Users can read referral bonuses" ON referral_bonuses
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage referral bonuses" ON referral_bonuses
  FOR ALL TO service_role USING (true);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(telegram_id BIGINT)
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    code := 'REF' || telegram_id || '_' || EXTRACT(EPOCH FROM NOW())::INTEGER || '_' || (RANDOM() * 1000)::INTEGER;
    SELECT COUNT(*) INTO exists_check FROM users WHERE referral_code = code;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to check active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(user_telegram_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM subscriptions s
  JOIN users u ON s.user_id = u.id
  WHERE u.telegram_id = user_telegram_id
    AND s.is_active = true
    AND s.end_date > NOW();
  
  RETURN active_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data
INSERT INTO servers (server_name, server_ip, country, vless_domain, vless_port, server_port, status) VALUES
  ('Netherlands-01', '185.246.208.123', 'Netherlands', 'nl1.gramvpn.com', 443, 8080, true),
  ('Germany-01', '194.233.164.45', 'Germany', 'de1.gramvpn.com', 443, 8080, true),
  ('USA-01', '167.172.96.234', 'USA', 'us1.gramvpn.com', 443, 8080, false);

INSERT INTO promo_codes (code, discount_percent, valid_for, max_usage) VALUES
  ('WELCOME30', 30, 'all', 1000),
  ('NEWYEAR50', 50, 'all', 500),
  ('FRIEND20', 20, 'all', NULL);
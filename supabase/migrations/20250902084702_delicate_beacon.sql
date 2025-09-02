/*
  # Create users table for VPN service

  1. New Tables
    - `users`
      - `id` (serial, primary key)
      - `telegram_id` (bigint, unique) - Telegram user ID
      - `first_name` (text) - User's first name
      - `last_name` (text, nullable) - User's last name
      - `username` (text, nullable) - Telegram username
      - `free_trial_used` (boolean) - Whether user used free trial
      - `free_trial_started_at` (timestamp, nullable) - When trial started
      - `free_trial_expires_at` (timestamp, nullable) - When trial expires
      - `subscription_active` (boolean) - Whether subscription is active
      - `subscription_expires_at` (timestamp, nullable) - When subscription expires
      - `referral_code` (text, unique) - User's unique referral code
      - `referred_by` (text, nullable) - Referral code used by this user
      - `total_referrals` (integer) - Number of successful referrals
      - `bonus_days_earned` (integer) - Bonus days from referrals
      - `created_at` (timestamp) - Account creation time
      - `updated_at` (timestamp) - Last update time

  2. Security
    - Enable RLS on `users` table
    - Add policy for users to read/update their own data
    - Add policy for service role to manage all data

  3. Indexes
    - Index on telegram_id for fast lookups
    - Index on referral_code for referral system
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  username TEXT,
  free_trial_used BOOLEAN DEFAULT FALSE,
  free_trial_started_at TIMESTAMPTZ,
  free_trial_expires_at TIMESTAMPTZ,
  subscription_active BOOLEAN DEFAULT FALSE,
  subscription_expires_at TIMESTAMPTZ,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  total_referrals INTEGER DEFAULT 0,
  bonus_days_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read and update their own data
CREATE POLICY "Users can manage own data"
  ON users
  FOR ALL
  TO authenticated
  USING (telegram_id = (current_setting('app.current_user_telegram_id'))::bigint);

-- Policy: Service role can manage all data (for your app)
CREATE POLICY "Service role can manage all users"
  ON users
  FOR ALL
  TO service_role
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
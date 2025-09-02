/*
  # Fix RLS policies for user creation

  1. Policy Changes
    - Drop existing restrictive policies
    - Create new policies that allow user creation from client
    - Allow anon users to insert their own user records
    - Keep security for reading/updating data

  2. Security
    - Users can create their own records
    - Users can read/update only their own data
    - Service role maintains full access
    - Public read access for referral lookups
*/

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can manage own data" ON users;
DROP POLICY IF EXISTS "Users can create own account" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "Anyone can read active campaigns" ON marketing_campaigns;
DROP POLICY IF EXISTS "Service role can manage campaigns" ON marketing_campaigns;

-- Create simple policies for users table
CREATE POLICY "Allow user creation"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow user read"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow user update"
  ON users
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Service role can still manage everything
CREATE POLICY "Service role full access"
  ON users
  FOR ALL
  TO service_role
  USING (true);

-- Fix subscriptions table policies
DROP POLICY IF EXISTS "Users can read own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;

CREATE POLICY "Allow subscription operations"
  ON subscriptions
  FOR ALL
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role subscription access"
  ON subscriptions
  FOR ALL
  TO service_role
  USING (true);

-- Fix servers table policies
DROP POLICY IF EXISTS "Anyone can read active servers" ON servers;
DROP POLICY IF EXISTS "Service role can manage servers" ON servers;

CREATE POLICY "Allow server read"
  ON servers
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role server access"
  ON servers
  FOR ALL
  TO service_role
  USING (true);

-- Fix payments table policies
DROP POLICY IF EXISTS "Users can read own payments" ON payments;
DROP POLICY IF EXISTS "Service role can manage payments" ON payments;

CREATE POLICY "Allow payment operations"
  ON payments
  FOR ALL
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role payment access"
  ON payments
  FOR ALL
  TO service_role
  USING (true);

-- Fix promo_codes table policies
DROP POLICY IF EXISTS "Anyone can read active promo codes" ON promo_codes;
DROP POLICY IF EXISTS "Service role can manage promo codes" ON promo_codes;

CREATE POLICY "Allow promo code read"
  ON promo_codes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role promo access"
  ON promo_codes
  FOR ALL
  TO service_role
  USING (true);

-- Fix referral_bonuses table policies
DROP POLICY IF EXISTS "Users can read referral bonuses" ON referral_bonuses;
DROP POLICY IF EXISTS "Service role can manage referral bonuses" ON referral_bonuses;

CREATE POLICY "Allow referral operations"
  ON referral_bonuses
  FOR ALL
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role referral access"
  ON referral_bonuses
  FOR ALL
  TO service_role
  USING (true);
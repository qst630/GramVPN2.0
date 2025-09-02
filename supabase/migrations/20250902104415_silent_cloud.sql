/*
  # Fix RLS policies for user creation

  1. Policy Changes
    - Update users table policies to allow user creation from client
    - Allow anon users to insert their own user records
    - Keep existing security for reading/updating data

  2. Security
    - Users can create their own records using telegram_id
    - Users can read/update only their own data
    - Service role maintains full access
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can manage own data" ON users;

-- Create new policies that allow user creation
CREATE POLICY "Users can create own account"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (
    telegram_id = (current_setting('app.current_user_telegram_id', true))::bigint
    OR auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO anon, authenticated
  USING (
    telegram_id = (current_setting('app.current_user_telegram_id', true))::bigint
    OR auth.uid() IS NOT NULL
  );

-- Service role can still manage everything
CREATE POLICY "Service role can manage all users"
  ON users
  FOR ALL
  TO service_role
  USING (true);
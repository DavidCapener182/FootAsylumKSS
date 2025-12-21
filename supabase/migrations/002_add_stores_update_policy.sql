-- Add UPDATE policy for fa_stores to allow all logged-in users to update audit data
-- This allows ops and readonly users to update compliance audit fields

CREATE POLICY "Users can update store audit data"
  ON fa_stores FOR UPDATE
  USING (fa_get_user_role(auth.uid()) IN ('admin', 'ops', 'readonly'))
  WITH CHECK (fa_get_user_role(auth.uid()) IN ('admin', 'ops', 'readonly'));



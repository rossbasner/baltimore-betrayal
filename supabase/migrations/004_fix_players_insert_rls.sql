-- Allow authenticated users to insert their own record if the signup trigger missed it
CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "players_insert_own"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

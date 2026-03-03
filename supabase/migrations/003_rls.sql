-- ============================================================
-- Baltimore Betrayal — Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE roundtables ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE last_stand_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_game_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_player_status()
RETURNS player_status AS $$
  SELECT p.status FROM players p
  JOIN users u ON u.id = p.user_id
  WHERE u.id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_host_or_admin()
RETURNS boolean AS $$
  SELECT role IN ('host', 'admin') FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- USERS TABLE POLICIES
-- ============================================================

-- Users can read any user record (needed for role checks)
CREATE POLICY "users_select_authenticated"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Users can update only their own record
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Service role can do anything (used by admin API routes)
CREATE POLICY "users_all_service"
  ON users FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- PLAYERS TABLE POLICIES
-- ============================================================

-- All authenticated users can view all players
CREATE POLICY "players_select_authenticated"
  ON players FOR SELECT
  TO authenticated
  USING (true);

-- Players can update their own profile
CREATE POLICY "players_update_own"
  ON players FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Host and admin can update any player
CREATE POLICY "players_update_host_admin"
  ON players FOR UPDATE
  TO authenticated
  USING (is_host_or_admin());

-- Service role full access
CREATE POLICY "players_all_service"
  ON players FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- ROUNDTABLES TABLE POLICIES
-- ============================================================

-- All authenticated users can view roundtables
CREATE POLICY "roundtables_select_authenticated"
  ON roundtables FOR SELECT
  TO authenticated
  USING (true);

-- Only host/admin can create or update roundtables
CREATE POLICY "roundtables_write_host_admin"
  ON roundtables FOR ALL
  TO authenticated
  USING (is_host_or_admin());

CREATE POLICY "roundtables_all_service"
  ON roundtables FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- VOTES TABLE POLICIES
-- ============================================================

-- Players can insert their own vote
CREATE POLICY "votes_insert_own"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (
    voter_id = (SELECT id FROM players WHERE user_id = auth.uid())
  );

-- Players can update their own vote (change vote before close)
CREATE POLICY "votes_update_own"
  ON votes FOR UPDATE
  TO authenticated
  USING (
    voter_id = (SELECT id FROM players WHERE user_id = auth.uid())
  );

-- Players can only see count totals (not who voted for whom) during open/announcement phase
-- Full visibility after reveal - enforced at application layer via service role
-- RLS: players can see their own vote + host/admin see all
CREATE POLICY "votes_select_own"
  ON votes FOR SELECT
  TO authenticated
  USING (
    voter_id = (SELECT id FROM players WHERE user_id = auth.uid())
    OR is_host_or_admin()
  );

-- After reveal (status = 'reveal' or 'closed'), all votes visible — handled via service role in API
CREATE POLICY "votes_all_service"
  ON votes FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- CHALLENGE RESPONSES
-- ============================================================

-- Players can insert their own responses
CREATE POLICY "challenge_responses_insert_own"
  ON challenge_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = (SELECT id FROM players WHERE user_id = auth.uid())
  );

-- Players can view their own responses + host/admin see all
-- During matching phase, anonymized view is handled server-side
CREATE POLICY "challenge_responses_select"
  ON challenge_responses FOR SELECT
  TO authenticated
  USING (
    player_id = (SELECT id FROM players WHERE user_id = auth.uid())
    OR is_host_or_admin()
    OR challenge_type = 'faithful_or_fake_guess' -- guesses are visible during matching
  );

CREATE POLICY "challenge_responses_all_service"
  ON challenge_responses FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- CHALLENGE SCORES
-- ============================================================

-- All authenticated can view scores (for leaderboard)
CREATE POLICY "challenge_scores_select_authenticated"
  ON challenge_scores FOR SELECT
  TO authenticated
  USING (true);

-- Only host/admin/service can write scores
CREATE POLICY "challenge_scores_write_host_admin"
  ON challenge_scores FOR ALL
  TO authenticated
  USING (is_host_or_admin());

CREATE POLICY "challenge_scores_all_service"
  ON challenge_scores FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- LAST STAND QUESTIONS
-- ============================================================

-- All authenticated can view questions (needed to play)
CREATE POLICY "last_stand_questions_select_authenticated"
  ON last_stand_questions FOR SELECT
  TO authenticated
  USING (true);

-- Only host/admin can write questions
CREATE POLICY "last_stand_questions_write_host_admin"
  ON last_stand_questions FOR ALL
  TO authenticated
  USING (is_host_or_admin());

CREATE POLICY "last_stand_questions_all_service"
  ON last_stand_questions FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- WORD GAME PROGRESS
-- ============================================================

-- Only limbo players and host/admin can view word game progress
CREATE POLICY "word_game_select"
  ON word_game_progress FOR SELECT
  TO authenticated
  USING (
    player_id = (SELECT id FROM players WHERE user_id = auth.uid())
    OR is_host_or_admin()
    OR get_player_status() = 'limbo'
  );

-- Players can only mark their own words
CREATE POLICY "word_game_insert_own"
  ON word_game_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = (SELECT id FROM players WHERE user_id = auth.uid())
    AND get_player_status() = 'limbo'
  );

-- Players can delete their own word marks (un-mark)
CREATE POLICY "word_game_delete_own"
  ON word_game_progress FOR DELETE
  TO authenticated
  USING (
    player_id = (SELECT id FROM players WHERE user_id = auth.uid())
  );

CREATE POLICY "word_game_all_service"
  ON word_game_progress FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- SCHEDULE EVENTS
-- ============================================================

-- All authenticated can view schedule
CREATE POLICY "schedule_select_authenticated"
  ON schedule_events FOR SELECT
  TO authenticated
  USING (true);

-- Only host/admin can modify schedule
CREATE POLICY "schedule_write_host_admin"
  ON schedule_events FOR ALL
  TO authenticated
  USING (is_host_or_admin());

CREATE POLICY "schedule_all_service"
  ON schedule_events FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================

-- All authenticated can view announcements
CREATE POLICY "announcements_select_authenticated"
  ON announcements FOR SELECT
  TO authenticated
  USING (true);

-- Only host/admin can create announcements
CREATE POLICY "announcements_write_host_admin"
  ON announcements FOR ALL
  TO authenticated
  USING (is_host_or_admin());

CREATE POLICY "announcements_all_service"
  ON announcements FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- GAME STATE
-- ============================================================

-- All authenticated can view game state
CREATE POLICY "game_state_select_authenticated"
  ON game_state FOR SELECT
  TO authenticated
  USING (true);

-- Only host/admin can update game state
CREATE POLICY "game_state_write_host_admin"
  ON game_state FOR UPDATE
  TO authenticated
  USING (is_host_or_admin());

CREATE POLICY "game_state_all_service"
  ON game_state FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- STORAGE BUCKET (run separately in Supabase dashboard or CLI)
-- ============================================================
-- CREATE BUCKET player-photos (public: false)
-- Allow authenticated users to upload to their own folder
-- Allow all authenticated to read photos

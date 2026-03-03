-- ============================================================
-- Baltimore Betrayal — Database Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('player', 'host', 'admin');
CREATE TYPE player_status AS ENUM ('in_game', 'murdered', 'banished', 'limbo');
CREATE TYPE roundtable_status AS ENUM ('open', 'announcement', 'reveal', 'closed');
CREATE TYPE event_status AS ENUM ('upcoming', 'current', 'complete');
CREATE TYPE event_day AS ENUM ('friday', 'saturday', 'sunday');
CREATE TYPE challenge_type AS ENUM ('faithful_or_fake', 'faithful_or_fake_guess', 'last_stand');
CREATE TYPE announcement_type AS ENUM ('murder', 'general');

-- ============================================================
-- USERS (extends auth.users)
-- ============================================================

CREATE TABLE users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'player',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PLAYERS
-- ============================================================

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  alter_ego_name TEXT,
  real_name TEXT,
  bio TEXT,
  photo_url TEXT,
  status player_status NOT NULL DEFAULT 'in_game',
  shield_count INTEGER NOT NULL DEFAULT 0,
  challenge_points INTEGER NOT NULL DEFAULT 0,
  profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROUNDTABLES
-- ============================================================

CREATE TABLE roundtables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number INTEGER NOT NULL,
  status roundtable_status NOT NULL DEFAULT 'open',
  current_announcement_index INTEGER NOT NULL DEFAULT 0,
  announcement_order UUID[], -- ordered list of player IDs for announcement
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- ============================================================
-- VOTES
-- ============================================================

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roundtable_id UUID REFERENCES roundtables(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  voted_for_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(roundtable_id, voter_id),
  CHECK (voter_id != voted_for_id)
);

-- ============================================================
-- CHALLENGE RESPONSES (Faithful or Fake answers + guesses)
-- ============================================================

CREATE TABLE challenge_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_type challenge_type NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  question_id INTEGER NOT NULL,
  answer TEXT NOT NULL,
  target_player_id UUID REFERENCES players(id) ON DELETE CASCADE, -- used for guesses
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_type, player_id, question_id)
);

-- ============================================================
-- CHALLENGE SCORES
-- ============================================================

CREATE TABLE challenge_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_type challenge_type NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  shields_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_type, player_id)
);

-- ============================================================
-- LAST STAND QUESTIONS (host-configured)
-- ============================================================

CREATE TABLE last_stand_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_number INTEGER NOT NULL UNIQUE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  is_traitor_hint BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECRET WORD GAME PROGRESS
-- ============================================================

CREATE TABLE word_game_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  word TEXT NOT NULL,
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, word)
);

-- ============================================================
-- SCHEDULE EVENTS
-- ============================================================

CREATE TABLE schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status event_status NOT NULL DEFAULT 'upcoming',
  day event_day NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ANNOUNCEMENTS (murder/general — full-screen takeover)
-- ============================================================

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  type announcement_type NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  displayed_at TIMESTAMPTZ
);

-- ============================================================
-- GAME STATE (single-row global state)
-- ============================================================

CREATE TABLE game_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  faithful_or_fake_active BOOLEAN NOT NULL DEFAULT FALSE,
  faithful_or_fake_submissions_closed BOOLEAN NOT NULL DEFAULT FALSE,
  last_stand_active BOOLEAN NOT NULL DEFAULT FALSE,
  secret_word_game_active BOOLEAN NOT NULL DEFAULT FALSE,
  active_roundtable_id UUID REFERENCES roundtables(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (id = 1) -- ensure single row
);

-- Insert the single game state row
INSERT INTO game_state (id) VALUES (1);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at on players
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER game_state_updated_at
  BEFORE UPDATE ON game_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create user record after auth signup
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, role)
  VALUES (NEW.id, NEW.email, 'player')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO players (user_id, profile_complete)
  VALUES (NEW.id, FALSE)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_players_status ON players(status);
CREATE INDEX idx_votes_roundtable_id ON votes(roundtable_id);
CREATE INDEX idx_votes_voter_id ON votes(voter_id);
CREATE INDEX idx_challenge_responses_player ON challenge_responses(player_id, challenge_type);
CREATE INDEX idx_word_game_player ON word_game_progress(player_id);
CREATE INDEX idx_schedule_events_day ON schedule_events(day, sort_order);
CREATE INDEX idx_announcements_created ON announcements(created_at DESC);

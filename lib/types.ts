// @ts-nocheck
export type UserRole = 'player' | 'host' | 'admin';
export type PlayerStatus = 'in_game' | 'murdered' | 'banished' | 'limbo';
export type RoundtableStatus = 'open' | 'announcement' | 'reveal' | 'closed';
export type EventStatus = 'upcoming' | 'current' | 'complete';
export type EventDay = 'friday' | 'saturday' | 'sunday';
export type ChallengeType = 'faithful_or_fake' | 'faithful_or_fake_guess' | 'last_stand';
export type AnnouncementType = 'murder' | 'general';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Player {
  id: string;
  user_id: string;
  alter_ego_name: string | null;
  real_name: string | null;
  bio: string | null;
  photo_url: string | null;
  status: PlayerStatus;
  shield_count: number;
  challenge_points: number;
  profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerWithUser extends Player {
  users: User;
}

export interface Roundtable {
  id: string;
  round_number: number;
  status: RoundtableStatus;
  current_announcement_index: number;
  announcement_order: string[] | null;
  created_at: string;
  closed_at: string | null;
}

export interface Vote {
  id: string;
  roundtable_id: string;
  voter_id: string;
  voted_for_id: string;
  created_at: string;
}

export interface ChallengeResponse {
  id: string;
  challenge_type: ChallengeType;
  player_id: string;
  question_id: number;
  answer: string;
  target_player_id: string | null;
  created_at: string;
}

export interface ChallengeScore {
  id: string;
  challenge_type: ChallengeType;
  player_id: string;
  score: number;
  shields_awarded: number;
  created_at: string;
}

export interface LastStandQuestion {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  is_traitor_hint: boolean;
  created_at: string;
}

export interface WordGameProgress {
  id: string;
  player_id: string;
  word: string;
  marked_at: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  scheduled_time: string;
  status: EventStatus;
  day: EventDay;
  sort_order: number;
  created_at: string;
}

export interface Announcement {
  id: string;
  message: string;
  type: AnnouncementType;
  created_at: string;
  displayed_at: string | null;
}

export interface GameState {
  id: number;
  faithful_or_fake_active: boolean;
  faithful_or_fake_submissions_closed: boolean;
  last_stand_active: boolean;
  secret_word_game_active: boolean;
  active_roundtable_id: string | null;
  updated_at: string;
}

// Database type for Supabase client
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'created_at'>;
        Update: Partial<User>;
      };
      players: {
        Row: Player;
        Insert: Omit<Player, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Player>;
      };
      roundtables: {
        Row: Roundtable;
        Insert: Omit<Roundtable, 'id' | 'created_at'>;
        Update: Partial<Roundtable>;
      };
      votes: {
        Row: Vote;
        Insert: Omit<Vote, 'id' | 'created_at'>;
        Update: Partial<Vote>;
      };
      challenge_responses: {
        Row: ChallengeResponse;
        Insert: Omit<ChallengeResponse, 'id' | 'created_at'>;
        Update: Partial<ChallengeResponse>;
      };
      challenge_scores: {
        Row: ChallengeScore;
        Insert: Omit<ChallengeScore, 'id' | 'created_at'>;
        Update: Partial<ChallengeScore>;
      };
      last_stand_questions: {
        Row: LastStandQuestion;
        Insert: Omit<LastStandQuestion, 'id' | 'created_at'>;
        Update: Partial<LastStandQuestion>;
      };
      word_game_progress: {
        Row: WordGameProgress;
        Insert: Omit<WordGameProgress, 'id'>;
        Update: Partial<WordGameProgress>;
      };
      schedule_events: {
        Row: ScheduleEvent;
        Insert: Omit<ScheduleEvent, 'id' | 'created_at'>;
        Update: Partial<ScheduleEvent>;
      };
      announcements: {
        Row: Announcement;
        Insert: Omit<Announcement, 'id' | 'created_at'>;
        Update: Partial<Announcement>;
      };
      game_state: {
        Row: GameState;
        Insert: Partial<GameState>;
        Update: Partial<GameState>;
      };
    };
    Enums: {
      user_role: UserRole;
      player_status: PlayerStatus;
      roundtable_status: RoundtableStatus;
      event_status: EventStatus;
      event_day: EventDay;
      challenge_type: ChallengeType;
      announcement_type: AnnouncementType;
    };
  };
}

// ---- Faithful or Fake game constants ----

export const FAITHFUL_OR_FAKE_QUESTIONS = [
  {
    id: 1,
    text: 'You find out your closest ally is lying to you. Do you:',
    options: [
      { key: 'A', text: 'Confront them privately' },
      { key: 'B', text: 'Expose them at the roundtable' },
      { key: 'C', text: 'Use it against them quietly' },
    ],
  },
  {
    id: 2,
    text: 'You have a shield. Another player you trust needs protection more than you. Do you:',
    options: [
      { key: 'A', text: 'Keep it' },
      { key: 'B', text: 'Gift it to them' },
      { key: 'C', text: 'Trade it for information' },
    ],
  },
  {
    id: 3,
    text: "You're 80% sure someone is a Traitor. Do you:",
    options: [
      { key: 'A', text: 'Vote them out immediately' },
      { key: 'B', text: 'Watch them for another round' },
      { key: 'C', text: 'Tell only one person you trust' },
    ],
  },
  {
    id: 4,
    text: 'Someone accuses you falsely at the roundtable. Do you:',
    options: [
      { key: 'A', text: 'Get angry and defend yourself loudly' },
      { key: 'B', text: 'Stay calm and deflect with humor' },
      { key: 'C', text: 'Pivot and accuse someone else' },
    ],
  },
  {
    id: 5,
    text: 'You witness a secret meeting between two players. Do you:',
    options: [
      { key: 'A', text: 'Immediately tell everyone' },
      { key: 'B', text: 'Approach one of them privately' },
      { key: 'C', text: 'Say nothing and file it away' },
    ],
  },
  {
    id: 6,
    text: "You're offered an alliance by someone you don't fully trust. Do you:",
    options: [
      { key: 'A', text: 'Accept and use them' },
      { key: 'B', text: 'Decline politely' },
      { key: 'C', text: 'Accept and immediately tell others' },
    ],
  },
  {
    id: 7,
    text: "It's the final roundtable. You're not sure if there are any Traitors left. Do you:",
    options: [
      { key: 'A', text: 'Vote to stop and share the prize' },
      { key: 'B', text: 'Keep voting to be sure' },
      { key: 'C', text: "Depends on who's left" },
    ],
  },
  {
    id: 8,
    text: 'Someone gives you information that could get an innocent person banished. Do you:',
    options: [
      { key: 'A', text: 'Use it anyway' },
      { key: 'B', text: 'Sit on it' },
      { key: 'C', text: 'Verify it first' },
    ],
  },
  {
    id: 9,
    text: "You're a Faithful and you think your best friend at the table is a Traitor. Do you:",
    options: [
      { key: 'A', text: 'Vote them out' },
      { key: 'B', text: 'Confront them privately first' },
      { key: 'C', text: "Protect them and hope you're wrong" },
    ],
  },
  {
    id: 10,
    text: 'You win a shield. Do you:',
    options: [
      { key: 'A', text: 'Tell no one' },
      { key: 'B', text: 'Tell your allies' },
      { key: 'C', text: 'Use it as a bargaining chip publicly' },
    ],
  },
] as const;

export const SECRET_WORDS = [
  'Castle',
  'Moist',
  'Fog',
  'Throbbing',
  'Hollow',
  'Velvet',
  'Nipple',
  'Wander',
  'Brittle',
  'Lubricate',
] as const;

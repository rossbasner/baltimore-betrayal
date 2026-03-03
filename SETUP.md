# 2nd Annual Baltimore Betrayal — Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Configure Environment Variables
```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

### 4. Run Database Migrations
In the Supabase dashboard, go to **SQL Editor** and run each migration file in order:
1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_seed.sql`
3. `supabase/migrations/003_rls.sql`

### 5. Set Up Storage
In Supabase dashboard → **Storage**:
1. Create a new bucket called `player-photos`
2. Set it to **Public** (so photos load without auth)
3. Add policies:
   - Allow authenticated users to upload to their own folder
   - Allow all users to read

Run this SQL in the SQL Editor for storage policies:
```sql
-- Allow authenticated users to upload to player-photos
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES
  ('Players can upload their own photo', 'player-photos', 'INSERT',
   '(auth.uid()::text = (storage.foldername(name))[1])'),
  ('Anyone can view player photos', 'player-photos', 'SELECT', 'true');
```

### 6. Set Up User Accounts

**Mia (Host):**
1. Create account at `/auth` with Mia's email
2. In Supabase SQL Editor, update her role:
```sql
UPDATE users SET role = 'host' WHERE email = 'mia@example.com';
```
3. Create her player profile at `/profile/setup`

**Ross (Admin/Player):**
1. Create account at `/auth` with Ross's email
2. Update his role:
```sql
UPDATE users SET role = 'admin' WHERE email = 'ross@example.com';
```
3. Complete profile at `/profile/setup` — his admin status is invisible to other players

**All other players:**
- Create accounts normally at `/auth`
- Complete profiles at `/profile/setup`

### 7. Adjust Game Dates
Edit `supabase/migrations/002_seed.sql` and update the timestamps to match your actual weekend dates, then re-run the seed SQL.

Or update directly in Supabase:
```sql
-- Shift all events by N days (example: shift forward 7 days)
UPDATE schedule_events
SET scheduled_time = scheduled_time + INTERVAL '7 days';
```

### 8. Enable Realtime
In Supabase dashboard → **Database → Replication**:
Enable realtime for these tables:
- `players`
- `votes`
- `roundtables`
- `game_state`
- `schedule_events`
- `announcements`
- `word_game_progress`
- `challenge_scores`

### 9. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard or:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

---

## Host Dashboard Guide

Access at `/host` (only for Mia and Ross).

### Weekend Flow

**Before the game:**
- All players create accounts and complete profiles
- Mia and Ross verify all player cards look correct

**During the game:**

1. **Schedule**: Mark events as "Now" or "Complete" as they happen
2. **Murder Announcements**: Write dramatic messages, click "Send Murder"
3. **Challenges**: Activate games from the Challenges section
4. **Roundtables**: Open → players vote → Close → run announcements → Reveal Tally
5. **Secret Word Game**: Activate at 10:30 PM Saturday, close at midnight
6. **Player Management**: Update shields, status after each round

### Status Values
- `in_game` — Normal active player (default)
- `murdered` — Killed in the night (card looks normal to players — murder is announced separately)
- `limbo` — Secret state (card looks normal to players — only they can see the secret word game)
- `banished` — Publicly banished at roundtable (badge shown on card)

---

## Architecture Notes

- **Next.js 14** App Router with server + client components
- **Supabase** for auth, database, realtime subscriptions, and storage
- **Row Level Security** enforces access control at the database level
- **Real-time subscriptions** update all clients instantly when host changes game state
- Murder announcements appear as full-screen overlays on all connected devices

---

## Common Issues

**Photos not loading:** Check Supabase Storage bucket is public and policies are set correctly.

**Real-time not working:** Ensure tables are added to Supabase Realtime replication.

**Auth redirect loop:** Clear browser cookies and try again; check middleware.ts.

**Host dashboard not accessible:** Verify user role is set to `host` or `admin` in the `users` table.

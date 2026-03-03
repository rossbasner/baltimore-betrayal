// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import HostDashboardClient from './host-dashboard-client';

export const revalidate = 0;

export default async function HostPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData || !['host', 'admin'].includes(userData.role)) {
    redirect('/');
  }

  // All players with users
  const { data: players } = await supabase
    .from('players')
    .select('*, users!inner(id, email, role)')
    .order('alter_ego_name');

  // Schedule events
  const { data: events } = await supabase
    .from('schedule_events')
    .select('*')
    .order('scheduled_time');

  // Game state
  const { data: gameState } = await supabase
    .from('game_state')
    .select('*')
    .eq('id', 1)
    .single();

  // Active roundtable
  let roundtable = null;
  let votes: { voter_id: string; voted_for_id: string; voter: { alter_ego_name: string | null } | null }[] = [];
  if (gameState?.active_roundtable_id) {
    const { data: rt } = await supabase
      .from('roundtables')
      .select('*')
      .eq('id', gameState.active_roundtable_id)
      .single();
    roundtable = rt;

    // Get all votes for this roundtable
    const { data: voteData } = await supabase
      .from('votes')
      .select('voter_id, voted_for_id, voter:players!voter_id(alter_ego_name)')
      .eq('roundtable_id', gameState.active_roundtable_id);
    votes = (voteData ?? []) as typeof votes;
  }

  // Last stand questions
  const { data: lastStandQuestions } = await supabase
    .from('last_stand_questions')
    .select('*')
    .order('question_number');

  // Recent announcements
  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  // Word game progress
  const { data: wordProgress } = await supabase
    .from('word_game_progress')
    .select('player_id, word')
    .order('marked_at');

  // Challenge scores
  const { data: challengeScores } = await supabase
    .from('challenge_scores')
    .select('*, players(alter_ego_name)')
    .order('score', { ascending: false });

  // Faithful or Fake responses for results view
  const { data: fofResponses } = await supabase
    .from('challenge_responses')
    .select('player_id, question_id, answer, target_player_id')
    .eq('challenge_type', 'faithful_or_fake');

  return (
    <div className="min-h-screen bg-betrayal-black">
      {/* Host-only top bar */}
      <div className="bg-betrayal-dark border-b border-betrayal-gray py-3 px-4 sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <h1 className="font-cinzel text-betrayal-gold font-bold text-sm uppercase tracking-widest">
            Host Dashboard
          </h1>
          <a
            href="/"
            className="font-cinzel text-xs text-betrayal-muted hover:text-betrayal-text uppercase tracking-widest transition-colors"
          >
            ← Back to Game
          </a>
        </div>
      </div>

      <HostDashboardClient
        players={players ?? []}
        events={events ?? []}
        gameState={gameState}
        roundtable={roundtable}
        votes={votes}
        lastStandQuestions={lastStandQuestions ?? []}
        announcements={announcements ?? []}
        wordProgress={wordProgress ?? []}
        challengeScores={challengeScores ?? []}
        fofResponses={fofResponses ?? []}
      />
    </div>
  );
}

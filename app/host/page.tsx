// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import HostDashboardClient from './host-dashboard-client';

export const revalidate = 0;

export default async function HostPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const admin = createAdminClient();

  const { data: userData } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData || !['host', 'admin'].includes(userData.role)) {
    redirect('/');
  }

  const [
    { data: players },
    { data: events },
    { data: gameState },
    { data: lastStandQuestions },
    { data: announcements },
    { data: wordProgress },
    { data: challengeScores },
    { data: fofResponses },
  ] = await Promise.all([
    admin.from('players').select('*, users!inner(id, email, role)').order('alter_ego_name'),
    admin.from('schedule_events').select('*').order('scheduled_time'),
    admin.from('game_state').select('*').eq('id', 1).single(),
    admin.from('last_stand_questions').select('*').order('question_number'),
    admin.from('announcements').select('*').order('created_at', { ascending: false }).limit(10),
    admin.from('word_game_progress').select('player_id, word').order('marked_at'),
    admin.from('challenge_scores').select('*, players(alter_ego_name)').order('score', { ascending: false }),
    admin.from('challenge_responses').select('player_id, question_id, answer, target_player_id').eq('challenge_type', 'faithful_or_fake'),
  ]);

  let roundtable = null;
  let votes: { voter_id: string; voted_for_id: string; voter: { alter_ego_name: string | null } | null }[] = [];
  if (gameState?.active_roundtable_id) {
    const [{ data: rt }, { data: voteData }] = await Promise.all([
      admin.from('roundtables').select('*').eq('id', gameState.active_roundtable_id).single(),
      admin.from('votes').select('voter_id, voted_for_id, voter:players!voter_id(alter_ego_name)').eq('roundtable_id', gameState.active_roundtable_id),
    ]);
    roundtable = rt;
    votes = (voteData ?? []) as typeof votes;
  }

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

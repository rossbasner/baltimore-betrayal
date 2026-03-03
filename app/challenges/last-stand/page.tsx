// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '../../app-shell';
import LastStandClient from './last-stand-client';
import type { UserRole } from '@/lib/types';

export const revalidate = 0;

export default async function LastStandPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = (userData?.role ?? 'player') as UserRole;

  const { data: gameState } = await supabase
    .from('game_state')
    .select('*')
    .eq('id', 1)
    .single();

  if (!gameState?.last_stand_active) {
    redirect('/challenges');
  }

  const { data: currentPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Get questions (ordered)
  const { data: questions } = await supabase
    .from('last_stand_questions')
    .select('id, question_number, question_text, option_a, option_b, option_c, option_d, correct_answer')
    .order('question_number');

  // Get player's existing responses
  const { data: myResponses } = await supabase
    .from('challenge_responses')
    .select('question_id, answer')
    .eq('challenge_type', 'last_stand')
    .eq('player_id', currentPlayer?.id ?? '');

  // Get scores (for leaderboard)
  const { data: scores } = await supabase
    .from('challenge_scores')
    .select('*, players(alter_ego_name, photo_url)')
    .eq('challenge_type', 'last_stand')
    .order('score', { ascending: false });

  return (
    <AppShell userRole={userRole} votingActive={!!gameState?.active_roundtable_id}>
      <LastStandClient
        currentPlayer={currentPlayer}
        questions={(questions ?? []).map(q => ({ ...q, is_traitor_hint: false }))}
        myResponses={myResponses ?? []}
        scores={scores ?? []}
        gameActive={gameState?.last_stand_active ?? false}
      />
    </AppShell>
  );
}

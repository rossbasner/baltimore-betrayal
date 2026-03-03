// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import AppShell from '../../app-shell';
import FaithfulOrFakeClient from './faithful-or-fake-client';
import type { UserRole } from '@/lib/types';

export const revalidate = 0;

export default async function FaithfulOrFakePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const admin = createAdminClient();
  const { data: userData } = await admin
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

  if (!gameState?.faithful_or_fake_active) {
    redirect('/challenges');
  }

  // Get current player
  const { data: currentPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Check if current player has submitted answers
  const { data: myAnswers } = await supabase
    .from('challenge_responses')
    .select('*')
    .eq('challenge_type', 'faithful_or_fake')
    .eq('player_id', currentPlayer?.id ?? '')
    .order('question_id');

  const hasSubmitted = (myAnswers?.length ?? 0) === 10;

  // If submissions are closed, get anonymized answers for matching phase
  let anonymizedSets: { id: string; answers: Record<number, string> }[] = [];
  let myGuesses: { question_id: number; target_player_id: string }[] = [];
  let allPlayers: { id: string; alter_ego_name: string | null; photo_url: string | null }[] = [];

  if (gameState.faithful_or_fake_submissions_closed && currentPlayer) {
    // Get all players who submitted (excluding self)
    const { data: allResponses } = await supabase
      .from('challenge_responses')
      .select('player_id, question_id, answer')
      .eq('challenge_type', 'faithful_or_fake')
      .neq('player_id', currentPlayer.id);

    // Group by player_id
    const byPlayer: Record<string, Record<number, string>> = {};
    allResponses?.forEach(r => {
      if (!byPlayer[r.player_id]) byPlayer[r.player_id] = {};
      byPlayer[r.player_id][r.question_id] = r.answer;
    });

    // Create anonymized sets with shuffled order (consistent per session using player id as seed)
    const playerIds = Object.keys(byPlayer);
    anonymizedSets = playerIds.map(pid => ({
      id: pid,
      answers: byPlayer[pid],
    }));

    // Shuffle deterministically (server-side, all see same order)
    anonymizedSets.sort(() => 0.5 - Math.random());

    // Get player display info
    const { data: playerData } = await supabase
      .from('players')
      .select('id, alter_ego_name, photo_url')
      .in('id', playerIds);
    allPlayers = playerData ?? [];

    // Get my guesses
    const { data: guesses } = await supabase
      .from('challenge_responses')
      .select('question_id, target_player_id')
      .eq('challenge_type', 'faithful_or_fake_guess')
      .eq('player_id', currentPlayer.id);

    myGuesses = (guesses ?? []).filter(g => g.target_player_id !== null) as { question_id: number; target_player_id: string }[];
  }

  return (
    <AppShell userRole={userRole} votingActive={!!gameState?.active_roundtable_id}>
      <FaithfulOrFakeClient
        gameState={gameState}
        currentPlayer={currentPlayer}
        myAnswers={myAnswers ?? []}
        hasSubmitted={hasSubmitted}
        anonymizedSets={anonymizedSets}
        allPlayers={allPlayers}
        myGuesses={myGuesses}
      />
    </AppShell>
  );
}

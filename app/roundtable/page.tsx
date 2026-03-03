// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '../app-shell';
import RoundtableClient from './roundtable-client';
import type { UserRole } from '@/lib/types';

export const revalidate = 0;

export default async function RoundtablePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = (userData?.role ?? 'player') as UserRole;

  // Get current player
  const { data: currentPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Get game state
  const { data: gameState } = await supabase
    .from('game_state')
    .select('*')
    .eq('id', 1)
    .single();

  // Get active roundtable
  let roundtable = null;
  if (gameState?.active_roundtable_id) {
    const { data: rt } = await supabase
      .from('roundtables')
      .select('*')
      .eq('id', gameState.active_roundtable_id)
      .single();
    roundtable = rt;
  }

  // Get votable players (all non-banished, non-host, including murdered/limbo)
  // so voting screen never reveals limbo status by absence
  const { data: votablePlayers } = await supabase
    .from('players')
    .select('*, users!inner(id, email, role)')
    .neq('users.role', 'host')
    .neq('status', 'banished');

  // Get vote counts for current roundtable (not who voted for whom)
  let votedCount = 0;
  if (roundtable) {
    const { count } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('roundtable_id', roundtable.id);
    votedCount = count ?? 0;
  }

  // Get current player's vote
  let myVote = null;
  if (roundtable && currentPlayer) {
    const { data: vote } = await supabase
      .from('votes')
      .select('voted_for_id')
      .eq('roundtable_id', roundtable.id)
      .eq('voter_id', currentPlayer.id)
      .single();
    myVote = vote?.voted_for_id ?? null;
  }

  // For reveal phase: get all votes via service role would be needed
  // Here we pass what's accessible, host dashboard handles the reveal
  let allVotes: { voter_id: string; voted_for_id: string }[] = [];
  if (roundtable?.status === 'reveal' || roundtable?.status === 'closed') {
    const { data: votes } = await supabase
      .from('votes')
      .select('voter_id, voted_for_id')
      .eq('roundtable_id', roundtable.id);
    allVotes = votes ?? [];
  }

  return (
    <AppShell userRole={userRole} votingActive={!!gameState?.active_roundtable_id}>
      <RoundtableClient
        currentPlayer={currentPlayer}
        votablePlayers={votablePlayers ?? []}
        roundtable={roundtable}
        votedCount={votedCount}
        totalVoters={(votablePlayers ?? []).length}
        myVote={myVote}
        allVotes={allVotes}
        gameStateRoundtableId={gameState?.active_roundtable_id ?? null}
      />
    </AppShell>
  );
}

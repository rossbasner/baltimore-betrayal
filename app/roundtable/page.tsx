// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

  const admin = createAdminClient();

  // Get game state
  const { data: gameState } = await admin
    .from('game_state')
    .select('*')
    .eq('id', 1)
    .single();

  // Get active roundtable
  let roundtable = null;
  if (gameState?.active_roundtable_id) {
    const { data: rt } = await admin
      .from('roundtables')
      .select('*')
      .eq('id', gameState.active_roundtable_id)
      .single();
    roundtable = rt;
  }

  // Fetch all non-banished players with user records; filter hosts in app code
  const { data: allPlayers } = await admin
    .from('players')
    .select('*, users!inner(id, email, role)')
    .neq('status', 'banished');

  const votablePlayers = (allPlayers ?? []).filter(p => p.users?.role !== 'host');
  const currentPlayer = (allPlayers ?? []).find(p => p.user_id === user.id) ?? null;

  // Get vote count + current player's vote
  let votedCount = 0;
  let myVote: string | null = null;
  let allVotes: { voter_id: string; voted_for_id: string }[] = [];

  if (roundtable && currentPlayer) {
    const [{ count }, { data: myVoteRow }] = await Promise.all([
      admin
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('roundtable_id', roundtable.id),
      admin
        .from('votes')
        .select('voted_for_id')
        .eq('roundtable_id', roundtable.id)
        .eq('voter_id', currentPlayer.id)
        .maybeSingle(),
    ]);
    votedCount = count ?? 0;
    myVote = myVoteRow?.voted_for_id ?? null;
  }

  // Full breakdown only available after voting closes
  if (roundtable && (roundtable.status === 'reveal' || roundtable.status === 'closed')) {
    const { data: votes } = await admin
      .from('votes')
      .select('voter_id, voted_for_id')
      .eq('roundtable_id', roundtable.id);
    allVotes = votes ?? [];
  }

  return (
    <AppShell userRole={userRole} votingActive={!!gameState?.active_roundtable_id}>
      <RoundtableClient
        currentPlayer={currentPlayer}
        votablePlayers={votablePlayers}
        roundtable={roundtable}
        votedCount={votedCount}
        totalVoters={votablePlayers.length}
        myVote={myVote}
        allVotes={allVotes}
        gameStateRoundtableId={gameState?.active_roundtable_id ?? null}
      />
    </AppShell>
  );
}

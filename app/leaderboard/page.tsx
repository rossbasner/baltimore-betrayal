// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '../app-shell';
import LeaderboardClient from './leaderboard-client';
import type { UserRole } from '@/lib/types';

export const revalidate = 0;

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = (userData?.role ?? 'player') as UserRole;

  // Get all non-host players ordered by shield count, then challenge points
  const { data: players } = await supabase
    .from('players')
    .select('*, users!inner(id, email, role)')
    .neq('users.role', 'host')
    .order('shield_count', { ascending: false });

  const { data: gameState } = await supabase
    .from('game_state')
    .select('active_roundtable_id')
    .eq('id', 1)
    .single();

  return (
    <AppShell userRole={userRole} votingActive={!!gameState?.active_roundtable_id}>
      <LeaderboardClient initialPlayers={players ?? []} />
    </AppShell>
  );
}

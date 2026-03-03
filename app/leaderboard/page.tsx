// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import AppShell from '../app-shell';
import LeaderboardClient from './leaderboard-client';
import type { UserRole } from '@/lib/types';

export const revalidate = 0;

export default async function LeaderboardPage() {
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

  const [{ data: allPlayers }, { data: gameState }] = await Promise.all([
    admin.from('players').select('*, users!inner(id, email, role)').order('shield_count', { ascending: false }),
    admin.from('game_state').select('active_roundtable_id').eq('id', 1).single(),
  ]);

  const players = (allPlayers ?? []).filter(p => p.users?.role !== 'host');

  return (
    <AppShell userRole={userRole} votingActive={!!gameState?.active_roundtable_id}>
      <LeaderboardClient initialPlayers={players} />
    </AppShell>
  );
}

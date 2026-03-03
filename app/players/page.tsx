// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '../app-shell';
import PlayersClient from './players-client';
import type { UserRole } from '@/lib/types';

export const revalidate = 0;

export default async function PlayersPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = (userData?.role ?? 'player') as UserRole;
  const isHostView = userRole === 'host' || userRole === 'admin';

  // Get all players with their user records
  const { data: players } = await supabase
    .from('players')
    .select('*, users!inner(id, email, role)')
    .order('alter_ego_name', { ascending: true });

  // Get game state for voting indicator
  const { data: gameState } = await supabase
    .from('game_state')
    .select('active_roundtable_id')
    .eq('id', 1)
    .single();

  return (
    <AppShell
      userRole={userRole}
      votingActive={!!gameState?.active_roundtable_id}
    >
      <PlayersClient
        initialPlayers={players ?? []}
        isHostView={isHostView}
        currentUserId={user.id}
      />
    </AppShell>
  );
}

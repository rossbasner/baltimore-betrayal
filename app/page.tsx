// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from './app-shell';
import HomeClient from './home-client';
import type { GameState, ScheduleEvent, UserRole } from '@/lib/types';

export const revalidate = 0;

export default async function HomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  // Get user role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  // Check profile complete (non-hosts)
  if (userData?.role === 'player') {
    const { data: player } = await supabase
      .from('players')
      .select('profile_complete')
      .eq('user_id', user.id)
      .single();

    if (!player?.profile_complete) redirect('/profile/setup');
  }

  // Get schedule events
  const { data: events } = await supabase
    .from('schedule_events')
    .select('*')
    .order('scheduled_time', { ascending: true });

  // Get game state for voting indicator
  const { data: gameState } = await supabase
    .from('game_state')
    .select('*')
    .eq('id', 1)
    .single();

  return (
    <AppShell
      userRole={(userData?.role ?? 'player') as UserRole}
      votingActive={!!gameState?.active_roundtable_id}
    >
      <HomeClient
        events={(events ?? []) as ScheduleEvent[]}
        gameState={gameState as GameState | null}
      />
    </AppShell>
  );
}

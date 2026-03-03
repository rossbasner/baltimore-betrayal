// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import AppShell from './app-shell';
import HomeClient from './home-client';
import type { GameState, ScheduleEvent, UserRole } from '@/lib/types';

export const revalidate = 0;

export default async function HomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  // Use admin client so role is always readable regardless of RLS
  const admin = createAdminClient();
  const { data: userData } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = (userData?.role ?? 'player') as UserRole;

  // Check profile complete (non-hosts/admins)
  if (userRole === 'player') {
    const { data: player } = await admin
      .from('players')
      .select('profile_complete, alter_ego_name')
      .eq('user_id', user.id)
      .single();

    if (!player?.profile_complete && !player?.alter_ego_name) redirect('/profile/setup');
  }

  const [{ data: events }, { data: gameState }] = await Promise.all([
    admin.from('schedule_events').select('*').order('scheduled_time', { ascending: true }),
    admin.from('game_state').select('*').eq('id', 1).single(),
  ]);

  return (
    <AppShell
      userRole={userRole}
      votingActive={!!gameState?.active_roundtable_id}
    >
      <HomeClient
        events={(events ?? []) as ScheduleEvent[]}
        gameState={gameState as GameState | null}
      />
    </AppShell>
  );
}

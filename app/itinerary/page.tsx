// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import AppShell from '../app-shell';
import ItineraryClient from './itinerary-client';
import type { UserRole, ScheduleEvent } from '@/lib/types';

export const revalidate = 0;

export default async function ItineraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  const userRole = (userData?.role ?? 'player') as UserRole;

  const admin = createAdminClient();

  const [{ data: events }, { data: gameState }] = await Promise.all([
    admin.from('schedule_events').select('*').order('day').order('sort_order').order('scheduled_time'),
    admin.from('game_state').select('active_roundtable_id').eq('id', 1).single(),
  ]);

  return (
    <AppShell userRole={userRole} votingActive={!!gameState?.active_roundtable_id}>
      <ItineraryClient events={(events ?? []) as ScheduleEvent[]} />
    </AppShell>
  );
}

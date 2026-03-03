// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import AppShell from '../app-shell';
import SecretWordClient from './secret-word-client';
import type { UserRole } from '@/lib/types';

export const revalidate = 0;

export default async function SecretWordGamePage() {
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
  const isHostOrAdmin = userRole === 'host' || userRole === 'admin';

  // Get current player
  const { data: currentPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Only limbo players and host/admin can access
  if (!isHostOrAdmin && currentPlayer?.status !== 'limbo') {
    notFound();
  }

  const { data: gameState } = await supabase
    .from('game_state')
    .select('secret_word_game_active')
    .eq('id', 1)
    .single();

  // Get marked words for current player
  const { data: myProgress } = await supabase
    .from('word_game_progress')
    .select('word, marked_at')
    .eq('player_id', currentPlayer?.id ?? '');

  // Get all limbo players' progress (for leaderboard)
  const { data: allProgress } = await supabase
    .from('word_game_progress')
    .select('player_id, word')
    .order('marked_at');

  // Get all limbo players
  const { data: limboPlayers } = await supabase
    .from('players')
    .select('id, alter_ego_name, real_name, photo_url')
    .eq('status', 'limbo');

  return (
    <AppShell userRole={userRole} votingActive={false}>
      <SecretWordClient
        currentPlayer={currentPlayer}
        gameActive={gameState?.secret_word_game_active ?? false}
        myProgress={myProgress ?? []}
        allProgress={allProgress ?? []}
        limboPlayers={limboPlayers ?? []}
        isHostOrAdmin={isHostOrAdmin}
      />
    </AppShell>
  );
}

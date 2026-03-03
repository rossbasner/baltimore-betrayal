// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import PlayerCard from '@/components/PlayerCard';
import type { Player, User } from '@/lib/types';
import { Users } from 'lucide-react';

interface PlayerWithUser extends Player {
  users: User;
}

interface PlayersClientProps {
  initialPlayers: PlayerWithUser[];
  isHostView: boolean;
  currentUserId: string;
}

export default function PlayersClient({ initialPlayers, isHostView, currentUserId }: PlayersClientProps) {
  const [players, setPlayers] = useState(initialPlayers);
  const supabase = createClient();

  useEffect(() => {
    const refetch = () => {
      fetch('/api/players')
        .then(r => r.json())
        .then(({ players: data }) => { if (data) setPlayers(data as PlayerWithUser[]); });
    };

    const channel = supabase
      .channel('players-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, refetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const activePlayers = players.filter(p => p.users.role !== 'host' || isHostView
    ? true : true); // show all including host
  const hostPlayer = players.find(p => p.users.role === 'host');
  const gamePlayers = players.filter(p => p.users.role !== 'host');

  return (
    <div className="max-w-screen-lg mx-auto px-4 pt-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <Users className="text-betrayal-gold" size={32} />
        </div>
        <h1 className="font-cinzel text-2xl font-bold text-betrayal-gold uppercase tracking-widest">
          The Players
        </h1>
        <p className="text-betrayal-muted text-sm mt-1">
          {gamePlayers.filter(p => p.status !== 'banished').length} remaining
          {isHostView && ` · ${gamePlayers.length} total`}
        </p>
      </div>

      {/* Host card (separate, at top) */}
      {hostPlayer && (
        <div className="mb-8">
          <div className="font-cinzel text-xs uppercase tracking-[0.3em] text-betrayal-muted mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-betrayal-gray" />
            Host
            <div className="h-px flex-1 bg-betrayal-gray" />
          </div>
          <div className="max-w-48 mx-auto">
            <PlayerCard
              player={hostPlayer}
              user={hostPlayer.users}
              isHostView={isHostView}
            />
          </div>
        </div>
      )}

      {/* Divider */}
      {hostPlayer && gamePlayers.length > 0 && (
        <div className="font-cinzel text-xs uppercase tracking-[0.3em] text-betrayal-muted mb-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-betrayal-gray" />
          Players
          <div className="h-px flex-1 bg-betrayal-gray" />
        </div>
      )}

      {/* Player grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {gamePlayers.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            user={player.users}
            isHostView={isHostView}
          />
        ))}
      </div>

      {gamePlayers.length === 0 && (
        <div className="text-center py-16">
          <p className="text-betrayal-muted text-sm">
            No players have joined yet.
          </p>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}

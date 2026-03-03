// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import type { Player, User } from '@/lib/types';
import { Trophy, Shield, Star } from 'lucide-react';

interface PlayerWithUser extends Player {
  users: User;
}

interface LeaderboardClientProps {
  initialPlayers: PlayerWithUser[];
}

function getAvatarInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function LeaderboardClient({ initialPlayers }: LeaderboardClientProps) {
  const [players, setPlayers] = useState(initialPlayers);
  const supabase = createClient();

  const sorted = [...players].sort((a, b) => {
    if (b.shield_count !== a.shield_count) return b.shield_count - a.shield_count;
    return b.challenge_points - a.challenge_points;
  });

  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-players')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players' },
        () => {
          supabase
            .from('players')
            .select('*, users!inner(id, email, role)')
            .neq('users.role', 'host')
            .then(({ data }) => { if (data) setPlayers(data as PlayerWithUser[]); });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  return (
    <div className="max-w-screen-sm mx-auto px-4 pt-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <Trophy className="text-betrayal-gold candle-flicker" size={36} />
        </div>
        <h1 className="font-cinzel text-2xl font-bold text-betrayal-gold uppercase tracking-widest">
          Shield Leaderboard
        </h1>
        <p className="text-betrayal-muted text-xs mt-1 uppercase tracking-widest font-cinzel">
          Live Rankings
        </p>
      </div>

      {/* Podium — top 3 */}
      {sorted.length >= 3 && (
        <div className="flex items-end justify-center gap-3 mb-8">
          {/* 2nd */}
          <PodiumCard player={sorted[1]} rank={2} />
          {/* 1st */}
          <PodiumCard player={sorted[0]} rank={1} />
          {/* 3rd */}
          <PodiumCard player={sorted[2]} rank={3} />
        </div>
      )}

      {/* Full list */}
      <div className="space-y-2">
        {sorted.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
              index === 0
                ? 'border-betrayal-gold border-opacity-50 bg-betrayal-gold bg-opacity-5 shadow-gold'
                : 'border-betrayal-gray bg-betrayal-dark'
            } ${player.status === 'banished' ? 'opacity-40' : ''}`}
          >
            {/* Rank */}
            <div className="w-8 text-center flex-shrink-0">
              {index === 0 ? (
                <Trophy size={18} className="text-betrayal-gold mx-auto" />
              ) : (
                <span className={`font-cinzel font-bold text-sm ${
                  index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-betrayal-muted'
                }`}>
                  {index + 1}
                </span>
              )}
            </div>

            {/* Avatar */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-betrayal-gray flex-shrink-0">
              {player.photo_url ? (
                <Image src={player.photo_url} alt={player.alter_ego_name ?? ''} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-cinzel text-xs font-bold text-betrayal-muted">
                    {getAvatarInitials(player.alter_ego_name)}
                  </span>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="font-cinzel text-sm font-semibold text-betrayal-text truncate">
                {player.alter_ego_name ?? 'Unknown'}
              </p>
              <p className="text-betrayal-muted text-xs truncate">
                {player.real_name}
                {player.status === 'banished' && ' · Banished'}
              </p>
            </div>

            {/* Shields + Points */}
            <div className="flex-shrink-0 text-right">
              <div className="flex items-center gap-1 justify-end">
                <Shield size={14} className="text-betrayal-gold" />
                <span className="font-cinzel font-bold text-betrayal-gold text-sm">
                  {player.shield_count}
                </span>
              </div>
              {player.challenge_points > 0 && (
                <div className="flex items-center gap-1 justify-end mt-0.5">
                  <Star size={11} className="text-betrayal-muted" />
                  <span className="text-betrayal-muted text-xs">{player.challenge_points} pts</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {sorted.length === 0 && (
        <p className="text-center text-betrayal-muted py-12 text-sm">
          No players yet
        </p>
      )}

      <div className="h-8" />
    </div>
  );
}

function PodiumCard({ player, rank }: { player: PlayerWithUser; rank: number }) {
  const heights: Record<number, string> = { 1: 'h-24', 2: 'h-16', 3: 'h-12' };
  const sizes: Record<number, string> = { 1: 'w-20', 2: 'w-16', 3: 'w-16' };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative ${sizes[rank]} aspect-square rounded-full overflow-hidden border-2 ${
        rank === 1 ? 'border-betrayal-gold shadow-gold' : 'border-betrayal-gray'
      }`}>
        {player.photo_url ? (
          <Image src={player.photo_url} alt={player.alter_ego_name ?? ''} fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-betrayal-gray flex items-center justify-center">
            <span className="font-cinzel font-bold text-betrayal-muted text-xs">
              {(player.alter_ego_name ?? '?')[0]}
            </span>
          </div>
        )}
        {rank === 1 && (
          <div className="absolute inset-0 bg-betrayal-gold opacity-10" />
        )}
      </div>
      <p className="font-cinzel text-xs text-betrayal-text text-center leading-tight max-w-20 truncate">
        {player.alter_ego_name}
      </p>
      <div className="flex items-center gap-1">
        <Shield size={12} className="text-betrayal-gold" />
        <span className="font-cinzel font-bold text-betrayal-gold text-sm">{player.shield_count}</span>
      </div>
      {/* Podium base */}
      <div className={`w-16 ${heights[rank]} rounded-t-sm flex items-center justify-center ${
        rank === 1
          ? 'bg-betrayal-gold bg-opacity-20 border-t border-x border-betrayal-gold border-opacity-40'
          : 'bg-betrayal-gray border-t border-x border-betrayal-gray-light'
      }`}>
        <span className={`font-cinzel font-black text-lg ${
          rank === 1 ? 'text-betrayal-gold' : 'text-betrayal-muted'
        }`}>{rank}</span>
      </div>
    </div>
  );
}

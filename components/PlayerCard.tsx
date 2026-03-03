// @ts-nocheck
import Image from 'next/image';
import { Crown, Shield } from 'lucide-react';
import type { Player, User } from '@/lib/types';

interface PlayerCardProps {
  player: Player;
  user: User;
  isHostView?: boolean; // Show true status to host
}

function getAvatarInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function PlayerCard({ player, user, isHostView = false }: PlayerCardProps) {
  const isHost = user.role === 'host';

  // Determine visible status badge
  const showBanished = !isHost && player.status === 'banished';
  const showTrueStatus = isHostView && player.status !== 'in_game';

  return (
    <div
      className={`card relative flex flex-col overflow-hidden transition-all duration-300 ${
        player.status === 'banished' ? 'opacity-60 grayscale' : 'hover:border-betrayal-gray-light'
      }`}
    >
      {/* Photo / Avatar */}
      <div className="relative aspect-square bg-betrayal-gray overflow-hidden">
        {player.photo_url ? (
          <Image
            src={player.photo_url}
            alt={player.alter_ego_name ?? 'Player'}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-betrayal-dark to-betrayal-gray">
            <span className="font-cinzel text-4xl font-bold text-betrayal-muted">
              {getAvatarInitials(player.alter_ego_name ?? player.real_name)}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-betrayal-dark via-transparent to-transparent" />

        {/* Host crown badge — top right */}
        {isHost && (
          <div className="absolute top-2 right-2">
            <span className="host-crown-badge">
              <Crown size={12} />
              Host
            </span>
          </div>
        )}

        {/* Shield count (players only, not host) */}
        {!isHost && player.shield_count > 0 && (
          <div className="absolute top-2 right-2">
            <span className="shield-badge">
              <Shield size={12} />
              {player.shield_count}
            </span>
          </div>
        )}

        {/* Banished overlay */}
        {player.status === 'banished' && (
          <div className="absolute inset-0 bg-betrayal-black bg-opacity-40 flex items-center justify-center">
            <div className="rotate-[-15deg]">
              <span className="status-banished text-lg tracking-[0.3em]">BANISHED</span>
            </div>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 flex-1 flex flex-col gap-1">
        {/* Alter ego name */}
        <h3 className="font-cinzel font-bold text-betrayal-text text-sm leading-tight line-clamp-1">
          {player.alter_ego_name || 'Mysterious Stranger'}
        </h3>

        {/* Real name */}
        <p className="text-betrayal-muted text-xs font-sans">
          {player.real_name || 'Unknown'}
        </p>

        {/* Bio */}
        {player.bio && (
          <p className="text-betrayal-muted text-xs font-sans leading-relaxed mt-1">
            {player.bio}
          </p>
        )}

        {/* Public badges */}
        <div className="mt-auto pt-2 flex flex-wrap gap-1">
          {showBanished && (
            <span className="status-banished">
              Banished
            </span>
          )}

          {/* Host view: true status */}
          {showTrueStatus && (
            <span
              className={`inline-flex items-center font-cinzel font-bold text-xs px-2 py-0.5 rounded-full uppercase tracking-widest ${
                player.status === 'murdered'
                  ? 'bg-betrayal-red bg-opacity-30 text-betrayal-red border border-betrayal-red border-opacity-50'
                  : player.status === 'limbo'
                  ? 'bg-purple-900 bg-opacity-50 text-purple-300 border border-purple-700'
                  : player.status === 'banished'
                  ? 'bg-betrayal-red text-betrayal-text'
                  : 'bg-green-900 bg-opacity-50 text-green-400'
              }`}
            >
              {player.status === 'in_game' ? 'In Game' : player.status.replace('_', ' ')}
            </span>
          )}

          {/* Host view: shield count */}
          {isHostView && !isHost && player.shield_count > 0 && (
            <span className="shield-badge text-xs">
              <Shield size={10} />
              {player.shield_count} shield{player.shield_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// @ts-nocheck
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import type { Player, User, Roundtable } from '@/lib/types';
import { Vote, Users, CheckCircle, Shield } from 'lucide-react';

interface PlayerWithUser extends Player {
  users: User;
}

interface RoundtableClientProps {
  currentPlayer: Player | null;
  votablePlayers: PlayerWithUser[];
  roundtable: Roundtable | null;
  votedCount: number;
  totalVoters: number;
  myVote: string | null;
  allVotes: { voter_id: string; voted_for_id: string }[];
  gameStateRoundtableId: string | null;
}

function getAvatarInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function RoundtableClient({
  currentPlayer,
  votablePlayers: initialVotable,
  roundtable: initialRoundtable,
  votedCount: initialCount,
  totalVoters,
  myVote: initialMyVote,
  allVotes: initialAllVotes,
  gameStateRoundtableId: initialRtId,
}: RoundtableClientProps) {
  const [roundtable, setRoundtable] = useState(initialRoundtable);
  const [votedCount, setVotedCount] = useState(initialCount);
  const [myVote, setMyVote] = useState(initialMyVote);
  const [allVotes, setAllVotes] = useState(initialAllVotes);
  const [votablePlayers, setVotablePlayers] = useState(initialVotable);
  const [activeRtId, setActiveRtId] = useState(initialRtId);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const refreshData = useCallback(async (rtId: string) => {
    const [{ data: rt }, { count }, { data: votes }] = await Promise.all([
      (supabase.from('roundtables') as any).select('*').eq('id', rtId).single(),
      (supabase.from('votes') as any).select('*', { count: 'exact', head: true }).eq('roundtable_id', rtId),
      (supabase.from('votes') as any).select('voter_id, voted_for_id').eq('roundtable_id', rtId),
    ]);
    if (rt) setRoundtable(rt as Roundtable);
    setVotedCount(count ?? 0);
    if (votes) setAllVotes(votes);
  }, [supabase]);

  useEffect(() => {
    if (!activeRtId) return;
    refreshData(activeRtId);

    // Subscribe to roundtable updates
    const rtChannel = supabase
      .channel('roundtable-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'roundtables', filter: `id=eq.${activeRtId}` },
        (payload) => setRoundtable(payload.new as Roundtable)
      )
      .subscribe();

    // Subscribe to vote count updates
    const votesChannel = supabase
      .channel('vote-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        () => { refreshData(activeRtId); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rtChannel);
      supabase.removeChannel(votesChannel);
    };
  }, [activeRtId, supabase, refreshData]);

  // Subscribe to game state for active roundtable changes
  useEffect(() => {
    const gsChannel = supabase
      .channel('game-state-rt')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_state' },
        (payload) => {
          const newRtId = payload.new.active_roundtable_id;
          setActiveRtId(newRtId);
          if (newRtId) refreshData(newRtId);
          else { setRoundtable(null); setVotedCount(0); }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(gsChannel); };
  }, [supabase, refreshData]);

  async function castVote(targetPlayerId: string) {
    if (!roundtable || !currentPlayer || submitting) return;
    if (targetPlayerId === currentPlayer.id) return;
    if (roundtable.status !== 'open') return;

    setSubmitting(true);
    const vote = {
      roundtable_id: roundtable.id,
      voter_id: currentPlayer.id,
      voted_for_id: targetPlayerId,
    };

    if (myVote) {
      await (supabase.from('votes') as any)
        .update({ voted_for_id: targetPlayerId })
        .eq('roundtable_id', roundtable.id)
        .eq('voter_id', currentPlayer.id);
    } else {
      await (supabase.from('votes') as any).insert(vote);
    }

    setMyVote(targetPlayerId);
    setSubmitting(false);
  }

  // ── NO ACTIVE ROUNDTABLE ──────────────────────────────────────
  if (!roundtable || !activeRtId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <Vote className="text-betrayal-muted mb-4" size={48} />
        <h2 className="font-cinzel text-xl font-bold text-betrayal-gold uppercase tracking-widest mb-2">
          Roundtable
        </h2>
        <p className="text-betrayal-muted text-sm">
          No vote is currently open.
        </p>
        <p className="text-betrayal-muted text-xs mt-2">
          The host will open voting when it&apos;s time.
        </p>
      </div>
    );
  }

  // ── ANNOUNCEMENT PHASE ────────────────────────────────────────
  if (roundtable.status === 'announcement') {
    const order = roundtable.announcement_order ?? [];
    const currentIdx = roundtable.current_announcement_index;
    const currentAnnouncerId = order[currentIdx];
    const announcer = votablePlayers.find(p => p.id === currentAnnouncerId);
    const remaining = order.length - currentIdx;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-lg w-full">
          <p className="font-cinzel text-xs uppercase tracking-[0.4em] text-betrayal-red mb-8">
            — The Announcement —
          </p>

          <div className="card border-betrayal-red border-opacity-40 p-8 mb-6">
            {announcer ? (
              <>
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-betrayal-gold mx-auto mb-5">
                  {announcer.photo_url ? (
                    <Image src={announcer.photo_url} alt={announcer.alter_ego_name ?? ''} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-betrayal-gray flex items-center justify-center">
                      <span className="font-cinzel font-bold text-2xl text-betrayal-muted">
                        {getAvatarInitials(announcer.alter_ego_name)}
                      </span>
                    </div>
                  )}
                </div>
                <h2 className="font-cinzel text-2xl font-bold text-betrayal-gold uppercase tracking-widest mb-1">
                  {announcer.alter_ego_name}
                </h2>
                <p className="text-betrayal-muted text-sm">is casting their vote…</p>
              </>
            ) : (
              <p className="text-betrayal-muted">Loading…</p>
            )}
          </div>

          <p className="text-betrayal-muted text-sm font-cinzel">
            {remaining} player{remaining !== 1 ? 's' : ''} remaining
          </p>
        </div>
      </div>
    );
  }

  // ── REVEAL PHASE ──────────────────────────────────────────────
  if (roundtable.status === 'reveal' || roundtable.status === 'closed') {
    // Tally votes
    const tally: Record<string, number> = {};
    allVotes.forEach(v => {
      tally[v.voted_for_id] = (tally[v.voted_for_id] ?? 0) + 1;
    });

    const sorted = Object.entries(tally)
      .map(([pid, count]) => ({
        player: votablePlayers.find(p => p.id === pid),
        count,
      }))
      .filter(x => x.player)
      .sort((a, b) => b.count - a.count);

    const maxVotes = sorted[0]?.count ?? 0;

    return (
      <div className="min-h-screen px-4 pt-8 pb-20">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <p className="font-cinzel text-xs uppercase tracking-[0.4em] text-betrayal-red mb-2">
              — The Tally —
            </p>
            <h2 className="font-cinzel text-2xl font-bold text-betrayal-gold uppercase tracking-widest">
              Round {roundtable.round_number} Results
            </h2>
          </div>

          <div className="space-y-3 mb-8">
            {sorted.map(({ player, count }, i) => (
              <div
                key={player!.id}
                className={`card p-4 flex items-center gap-4 transition-all ${
                  count === maxVotes && i === 0
                    ? 'border-betrayal-red border-opacity-60 shadow-red'
                    : ''
                }`}
                style={{
                  animationDelay: `${i * 0.15}s`,
                  animation: 'dramaticReveal 0.6s ease-out forwards',
                }}
              >
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-betrayal-gray flex-shrink-0">
                  {player!.photo_url ? (
                    <Image src={player!.photo_url} alt={player!.alter_ego_name ?? ''} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-cinzel font-bold text-betrayal-muted">
                        {getAvatarInitials(player!.alter_ego_name)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-cinzel font-bold text-betrayal-text truncate">
                    {player!.alter_ego_name}
                  </p>
                  {/* Vote bar */}
                  <div className="mt-1.5 h-1.5 bg-betrayal-gray rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        count === maxVotes ? 'bg-betrayal-red' : 'bg-betrayal-muted'
                      }`}
                      style={{ width: `${(count / totalVoters) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className={`font-cinzel font-black text-xl ${
                    count === maxVotes && i === 0 ? 'text-betrayal-red text-glow-red' : 'text-betrayal-muted'
                  }`}>
                    {count}
                  </span>
                  <p className="text-betrayal-muted text-xs">
                    {count === 1 ? 'vote' : 'votes'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-4 text-center border-betrayal-gray-light">
            <p className="text-betrayal-muted text-xs font-cinzel uppercase tracking-widest">
              In case of tie, the host decides.
            </p>
          </div>

          {/* Zero vote players */}
          {votablePlayers
            .filter(p => !tally[p.id] && p.id !== currentPlayer?.id)
            .length > 0 && (
            <div className="mt-4">
              <p className="text-betrayal-muted text-xs font-cinzel uppercase tracking-widest mb-2 text-center">
                No votes received
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {votablePlayers
                  .filter(p => !tally[p.id])
                  .map(p => (
                    <span key={p.id} className="text-betrayal-muted text-xs border border-betrayal-gray rounded px-2 py-1 font-cinzel">
                      {p.alter_ego_name}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── OPEN VOTING PHASE ─────────────────────────────────────────
  const eligibleToVote = votablePlayers.filter(p => p.id !== currentPlayer?.id);

  return (
    <div className="max-w-screen-sm mx-auto px-4 pt-8">
      {/* Header */}
      <div className="text-center mb-6">
        <p className="font-cinzel text-xs uppercase tracking-[0.4em] text-betrayal-red mb-2">
          — Roundtable #{roundtable.round_number} —
        </p>
        <h2 className="font-cinzel text-xl font-bold text-betrayal-gold uppercase tracking-widest">
          Cast Your Vote
        </h2>
        <p className="text-betrayal-muted text-sm mt-1">
          Who do you want banished from the castle?
        </p>
      </div>

      {/* Vote progress */}
      <div className="card p-3 mb-6 flex items-center gap-3">
        <Users size={16} className="text-betrayal-muted flex-shrink-0" />
        <div className="flex-1">
          <div className="flex justify-between text-xs font-cinzel mb-1">
            <span className="text-betrayal-muted uppercase tracking-widest">Votes Submitted</span>
            <span className="text-betrayal-gold">{votedCount} / {totalVoters}</span>
          </div>
          <div className="h-1 bg-betrayal-gray rounded-full overflow-hidden">
            <div
              className="h-full bg-betrayal-gold transition-all duration-500"
              style={{ width: `${totalVoters > 0 ? (votedCount / totalVoters) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* My current vote */}
      {myVote && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-betrayal-red bg-opacity-10 border border-betrayal-red border-opacity-30 rounded-lg">
          <CheckCircle size={16} className="text-betrayal-red flex-shrink-0" />
          <p className="text-sm text-betrayal-text font-cinzel">
            You voted for{' '}
            <span className="text-betrayal-red font-bold">
              {votablePlayers.find(p => p.id === myVote)?.alter_ego_name ?? 'Unknown'}
            </span>
            <span className="text-betrayal-muted text-xs ml-2">(tap another to change)</span>
          </p>
        </div>
      )}

      {/* Player grid */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {eligibleToVote.map((player) => {
          const isSelected = myVote === player.id;
          return (
            <button
              key={player.id}
              onClick={() => castVote(player.id)}
              disabled={submitting}
              className={`relative rounded-lg overflow-hidden border-2 transition-all duration-200 active:scale-95 ${
                isSelected
                  ? 'border-betrayal-red shadow-red'
                  : 'border-betrayal-gray hover:border-betrayal-gray-light'
              }`}
            >
              {/* Photo */}
              <div className="relative aspect-square bg-betrayal-gray">
                {player.photo_url ? (
                  <Image src={player.photo_url} alt={player.alter_ego_name ?? ''} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-betrayal-dark">
                    <span className="font-cinzel text-2xl font-bold text-betrayal-muted">
                      {getAvatarInitials(player.alter_ego_name)}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-betrayal-dark via-transparent to-transparent" />

                {/* Shield badge */}
                {player.shield_count > 0 && (
                  <div className="absolute top-2 right-2 shield-badge text-xs">
                    <Shield size={10} />
                    {player.shield_count}
                  </div>
                )}

                {/* Selection overlay */}
                {isSelected && (
                  <div className="absolute inset-0 bg-betrayal-red bg-opacity-25 flex items-center justify-center">
                    <div className="bg-betrayal-red rounded-full p-2">
                      <CheckCircle size={24} className="text-white" />
                    </div>
                  </div>
                )}
              </div>

              {/* Name */}
              <div className={`p-2 ${isSelected ? 'bg-betrayal-red bg-opacity-20' : 'bg-betrayal-dark'}`}>
                <p className={`font-cinzel text-xs font-bold text-center leading-tight ${
                  isSelected ? 'text-betrayal-red' : 'text-betrayal-text'
                }`}>
                  {player.alter_ego_name ?? 'Unknown'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {eligibleToVote.length === 0 && (
        <p className="text-center text-betrayal-muted py-12 text-sm">
          No players available to vote for.
        </p>
      )}
    </div>
  );
}

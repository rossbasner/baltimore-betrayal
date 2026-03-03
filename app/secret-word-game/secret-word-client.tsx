// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SECRET_WORDS } from '@/lib/types';
import type { Player } from '@/lib/types';
import Image from 'next/image';
import { Eye, EyeOff, Trophy, Moon } from 'lucide-react';

interface SecretWordClientProps {
  currentPlayer: Player | null;
  gameActive: boolean;
  myProgress: { word: string; marked_at: string }[];
  allProgress: { player_id: string; word: string }[];
  limboPlayers: { id: string; alter_ego_name: string | null; real_name: string | null; photo_url: string | null }[];
  isHostOrAdmin: boolean;
}

function getAvatarInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function SecretWordClient({
  currentPlayer,
  gameActive: initialActive,
  myProgress: initialProgress,
  allProgress: initialAllProgress,
  limboPlayers,
  isHostOrAdmin,
}: SecretWordClientProps) {
  const supabase = createClient();

  const [gameActive, setGameActive] = useState(initialActive);
  const [markedWords, setMarkedWords] = useState<Set<string>>(
    new Set(initialProgress.map(p => p.word))
  );
  const [allProgress, setAllProgress] = useState(initialAllProgress);
  const [tab, setTab] = useState<'words' | 'leaderboard'>('words');

  useEffect(() => {
    // Subscribe to game state
    const gsChannel = supabase
      .channel('swg-game-state')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_state' },
        (payload) => setGameActive(payload.new.secret_word_game_active)
      )
      .subscribe();

    // Subscribe to word progress (for leaderboard)
    const progressChannel = supabase
      .channel('swg-progress')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'word_game_progress' },
        () => {
          supabase
            .from('word_game_progress')
            .select('player_id, word')
            .order('marked_at')
            .then(({ data }) => { if (data) setAllProgress(data); });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gsChannel);
      supabase.removeChannel(progressChannel);
    };
  }, [supabase]);

  async function toggleWord(word: string) {
    if (!currentPlayer || !gameActive) return;

    const isMarked = markedWords.has(word);

    if (isMarked) {
      setMarkedWords(prev => { const next = new Set(prev); next.delete(word); return next; });
      await supabase
        .from('word_game_progress')
        .delete()
        .eq('player_id', currentPlayer.id)
        .eq('word', word);
    } else {
      setMarkedWords(prev => new Set([...prev, word]));
      await supabase
        .from('word_game_progress')
        .upsert({ player_id: currentPlayer.id, word }, { onConflict: 'player_id,word' });
    }
  }

  // Leaderboard data
  const leaderboard = limboPlayers
    .map(player => {
      const count = allProgress.filter(p => p.player_id === player.id).length;
      return { ...player, count };
    })
    .sort((a, b) => b.count - a.count);

  const notActive = !gameActive && !isHostOrAdmin;

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'radial-gradient(ellipse at top, rgba(40,0,60,0.4) 0%, #0A0A0A 60%)',
      }}
    >
      <div className="max-w-screen-sm mx-auto px-4 pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Moon className="text-purple-400 mx-auto mb-3" size={36} />
          <h1 className="font-cinzel text-2xl font-black text-purple-300 uppercase tracking-widest">
            The Secret Word Game
          </h1>
          <p className="text-purple-400 text-xs mt-1 font-cinzel uppercase tracking-[0.3em]">
            Limbo Players Only
          </p>

          {!gameActive && (
            <div className="mt-4 bg-purple-900 bg-opacity-20 border border-purple-700 border-opacity-30 rounded-lg p-3">
              <p className="text-purple-300 text-sm font-cinzel">
                {isHostOrAdmin ? 'Game not yet active — activate from dashboard' : 'The game has not begun yet'}
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-purple-900 mb-6">
          <button
            onClick={() => setTab('words')}
            className={`flex-1 py-2.5 font-cinzel text-xs uppercase tracking-widest transition-colors ${
              tab === 'words'
                ? 'text-purple-300 border-b-2 border-purple-400 -mb-px'
                : 'text-purple-600 hover:text-purple-400'
            }`}
          >
            Your Words
          </button>
          <button
            onClick={() => setTab('leaderboard')}
            className={`flex-1 py-2.5 font-cinzel text-xs uppercase tracking-widest transition-colors ${
              tab === 'leaderboard'
                ? 'text-purple-300 border-b-2 border-purple-400 -mb-px'
                : 'text-purple-600 hover:text-purple-400'
            }`}
          >
            Standings
          </button>
        </div>

        {/* Words tab */}
        {tab === 'words' && (
          <div>
            <p className="text-purple-400 text-sm text-center mb-5 leading-relaxed">
              Get active players to say each word naturally.
              <br />Tap a word when you hear it spoken.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {SECRET_WORDS.map((word) => {
                const isMarked = markedWords.has(word);
                return (
                  <button
                    key={word}
                    onClick={() => toggleWord(word)}
                    disabled={notActive}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                      isMarked
                        ? 'border-purple-400 bg-purple-900 bg-opacity-40 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                        : notActive
                        ? 'border-purple-900 border-opacity-30 opacity-40 cursor-not-allowed'
                        : 'border-purple-900 border-opacity-50 hover:border-purple-600 hover:bg-purple-900 hover:bg-opacity-20'
                    }`}
                  >
                    {isMarked && (
                      <div className="absolute top-2 right-2">
                        <Eye size={14} className="text-purple-400" />
                      </div>
                    )}
                    {!isMarked && !notActive && (
                      <div className="absolute top-2 right-2 opacity-20">
                        <EyeOff size={14} className="text-purple-600" />
                      </div>
                    )}
                    <span
                      className={`font-cinzel font-bold text-sm ${
                        isMarked ? 'text-purple-300 line-through decoration-purple-400' : 'text-purple-500'
                      }`}
                    >
                      {word}
                    </span>
                    {isMarked && (
                      <p className="font-cinzel text-xs text-purple-400 mt-1">✓ Said</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-center">
              <p className="font-cinzel text-sm text-purple-400">
                {markedWords.size} / {SECRET_WORDS.length} words obtained
              </p>
              <div className="mt-2 h-1.5 bg-purple-900 bg-opacity-40 rounded-full overflow-hidden max-w-xs mx-auto">
                <div
                  className="h-full bg-purple-400 transition-all duration-500"
                  style={{ width: `${(markedWords.size / SECRET_WORDS.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard tab */}
        {tab === 'leaderboard' && (
          <div>
            <div className="flex items-center gap-2 mb-5 justify-center">
              <Trophy size={16} className="text-purple-400" />
              <h2 className="font-cinzel text-sm uppercase tracking-widest text-purple-300">
                Limbo Standings
              </h2>
            </div>

            <div className="space-y-3">
              {leaderboard.map((player, i) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    i === 0 && player.count > 0
                      ? 'border-purple-500 border-opacity-60 bg-purple-900 bg-opacity-20'
                      : 'border-purple-900 border-opacity-30'
                  } ${player.id === currentPlayer?.id ? 'ring-1 ring-purple-600' : ''}`}
                >
                  <span className={`font-cinzel font-black text-lg w-6 text-center ${
                    i === 0 ? 'text-purple-300' : 'text-purple-600'
                  }`}>{i + 1}</span>

                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-purple-900 bg-opacity-40 flex-shrink-0 border border-purple-800">
                    {player.photo_url ? (
                      <Image src={player.photo_url} alt={player.alter_ego_name ?? ''} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-cinzel text-xs font-bold text-purple-500">
                          {getAvatarInitials(player.alter_ego_name)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-cinzel text-sm font-bold text-purple-300 truncate">
                      {player.alter_ego_name ?? 'Unknown'}
                      {player.id === currentPlayer?.id && (
                        <span className="text-purple-500 text-xs ml-2">(you)</span>
                      )}
                    </p>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <span className={`font-cinzel font-bold text-lg ${
                      i === 0 ? 'text-purple-300' : 'text-purple-500'
                    }`}>
                      {player.count}
                    </span>
                    <span className="text-purple-600 text-xs ml-1">/ {SECRET_WORDS.length}</span>
                  </div>
                </div>
              ))}

              {leaderboard.length === 0 && (
                <p className="text-center text-purple-600 text-sm py-8">
                  No limbo players yet
                </p>
              )}
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}

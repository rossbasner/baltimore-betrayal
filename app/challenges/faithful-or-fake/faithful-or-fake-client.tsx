// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FAITHFUL_OR_FAKE_QUESTIONS } from '@/lib/types';
import type { Player, GameState, ChallengeResponse } from '@/lib/types';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, CheckCircle, Users } from 'lucide-react';

interface FaithfulOrFakeClientProps {
  gameState: GameState;
  currentPlayer: Player | null;
  myAnswers: ChallengeResponse[];
  hasSubmitted: boolean;
  anonymizedSets: { id: string; answers: Record<number, string> }[];
  allPlayers: { id: string; alter_ego_name: string | null; photo_url: string | null }[];
  myGuesses: { question_id: number; target_player_id: string }[];
}

function getAvatarInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// Phase 1: Answer questions
function AnswerPhase({ currentPlayer, existingAnswers }: {
  currentPlayer: Player;
  existingAnswers: ChallengeResponse[];
}) {
  const supabase = createClient();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    const a: Record<number, string> = {};
    existingAnswers.forEach(r => { a[r.question_id] = r.answer; });
    return a;
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(existingAnswers.length === 10);

  const question = FAITHFUL_OR_FAKE_QUESTIONS[currentQ];
  const progress = Object.keys(answers).length;

  async function selectAnswer(key: string) {
    const qId = question.id;
    setAnswers(prev => ({ ...prev, [qId]: key }));

    // Save to DB
    await (supabase.from('challenge_responses') as any).upsert({
      challenge_type: 'faithful_or_fake',
      player_id: currentPlayer.id,
      question_id: qId,
      answer: key,
    }, { onConflict: 'challenge_type,player_id,question_id' });

    // Auto-advance after a brief moment
    setTimeout(() => {
      if (currentQ < FAITHFUL_OR_FAKE_QUESTIONS.length - 1) {
        setCurrentQ(prev => prev + 1);
      }
    }, 400);
  }

  async function submitAll() {
    setSubmitting(true);
    // All answers already saved via upsert above
    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <CheckCircle className="text-green-400 mb-4" size={48} />
        <h2 className="font-cinzel text-xl font-bold text-betrayal-gold uppercase tracking-widest mb-2">
          Answers Submitted
        </h2>
        <p className="text-betrayal-muted text-sm">
          Waiting for the host to close submissions and start the matching phase.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-sm mx-auto px-4 pt-8 pb-20">
      {/* Header */}
      <div className="text-center mb-6">
        <p className="font-cinzel text-xs uppercase tracking-[0.3em] text-betrayal-gold mb-1">
          Faithful or Fake
        </p>
        <p className="text-betrayal-muted text-xs">
          Answer honestly — your responses will be shown anonymously
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between font-cinzel text-xs text-betrayal-muted mb-1.5">
          <span>Question {currentQ + 1} of {FAITHFUL_OR_FAKE_QUESTIONS.length}</span>
          <span>{progress} answered</span>
        </div>
        <div className="h-1 bg-betrayal-gray rounded-full overflow-hidden">
          <div
            className="h-full bg-betrayal-gold transition-all duration-300"
            style={{ width: `${(progress / FAITHFUL_OR_FAKE_QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="card p-6 mb-5">
        <p className="font-playfair text-lg text-betrayal-text leading-relaxed mb-6" style={{ fontStyle: 'italic' }}>
          {question.text}
        </p>

        <div className="space-y-3">
          {question.options.map((opt) => {
            const isSelected = answers[question.id] === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => selectAnswer(opt.key)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-betrayal-gold bg-betrayal-gold bg-opacity-10 text-betrayal-gold'
                    : 'border-betrayal-gray hover:border-betrayal-gray-light text-betrayal-text hover:bg-betrayal-gray hover:bg-opacity-30'
                }`}
              >
                <span className="font-cinzel font-bold text-sm mr-3">{opt.key}.</span>
                <span className="text-sm">{opt.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
          disabled={currentQ === 0}
          className="flex items-center gap-1 btn-ghost py-2 px-4 disabled:opacity-30"
        >
          <ChevronLeft size={16} />
          Prev
        </button>

        <div className="flex gap-1.5">
          {FAITHFUL_OR_FAKE_QUESTIONS.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentQ(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                answers[q.id] ? 'bg-betrayal-gold' : i === currentQ ? 'bg-betrayal-muted' : 'bg-betrayal-gray'
              }`}
            />
          ))}
        </div>

        {currentQ < FAITHFUL_OR_FAKE_QUESTIONS.length - 1 ? (
          <button
            onClick={() => setCurrentQ(prev => prev + 1)}
            className="flex items-center gap-1 btn-ghost py-2 px-4"
          >
            Next
            <ChevronRight size={16} />
          </button>
        ) : (
          <div className="w-20" />
        )}
      </div>

      {/* Submit button */}
      {progress === FAITHFUL_OR_FAKE_QUESTIONS.length && (
        <button
          onClick={submitAll}
          disabled={submitting}
          className="btn-gold w-full"
        >
          {submitting ? 'Submitting…' : 'Lock In My Answers'}
        </button>
      )}
    </div>
  );
}

// Phase 2: Matching phase
function MatchingPhase({ currentPlayer, anonymizedSets, allPlayers, myGuesses }: {
  currentPlayer: Player;
  anonymizedSets: { id: string; answers: Record<number, string> }[];
  allPlayers: { id: string; alter_ego_name: string | null; photo_url: string | null }[];
  myGuesses: { question_id: number; target_player_id: string }[];
}) {
  const supabase = createClient();
  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  const [guesses, setGuesses] = useState<Record<number, string>>(() => {
    const g: Record<number, string> = {};
    // question_id here acts as set index
    myGuesses.forEach(mg => { g[mg.question_id] = mg.target_player_id; });
    return g;
  });
  const [done, setDone] = useState(false);

  const set = anonymizedSets[currentSetIdx];
  const progress = Object.keys(guesses).length;

  async function makeGuess(playerId: string) {
    const setIdx = currentSetIdx;
    setGuesses(prev => ({ ...prev, [setIdx]: playerId }));

    await (supabase.from('challenge_responses') as any).upsert({
      challenge_type: 'faithful_or_fake_guess',
      player_id: currentPlayer.id,
      question_id: setIdx,
      answer: playerId,
      target_player_id: playerId,
    }, { onConflict: 'challenge_type,player_id,question_id' });

    setTimeout(() => {
      if (currentSetIdx < anonymizedSets.length - 1) {
        setCurrentSetIdx(prev => prev + 1);
      } else {
        setDone(true);
      }
    }, 400);
  }

  if (done || progress === anonymizedSets.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <CheckCircle className="text-green-400 mb-4" size={48} />
        <h2 className="font-cinzel text-xl font-bold text-betrayal-gold uppercase tracking-widest mb-2">
          Matching Complete
        </h2>
        <p className="text-betrayal-muted text-sm">
          The host will reveal the scores and award shields.
        </p>
      </div>
    );
  }

  if (!set) return null;

  return (
    <div className="max-w-screen-sm mx-auto px-4 pt-8 pb-20">
      <div className="text-center mb-6">
        <p className="font-cinzel text-xs uppercase tracking-[0.3em] text-betrayal-gold mb-1">
          The Matching Game
        </p>
        <p className="text-betrayal-muted text-xs">
          Who do you think gave these answers?
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between font-cinzel text-xs text-betrayal-muted mb-1.5">
          <span>Profile {currentSetIdx + 1} of {anonymizedSets.length}</span>
          <span>{progress} matched</span>
        </div>
        <div className="h-1 bg-betrayal-gray rounded-full overflow-hidden">
          <div
            className="h-full bg-betrayal-gold transition-all duration-300"
            style={{ width: `${(progress / anonymizedSets.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Anonymous answer card */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-betrayal-muted" />
          <span className="font-cinzel text-xs uppercase tracking-widest text-betrayal-muted">
            Anonymous Player
          </span>
        </div>
        <div className="space-y-3">
          {FAITHFUL_OR_FAKE_QUESTIONS.map((q) => {
            const answer = set.answers[q.id];
            if (!answer) return null;
            const opt = q.options.find(o => o.key === answer);
            return (
              <div key={q.id} className="border-l-2 border-betrayal-gray pl-3">
                <p className="text-betrayal-muted text-xs mb-0.5">{q.text.slice(0, 50)}…</p>
                <p className="text-betrayal-text text-sm">
                  <span className="font-cinzel font-bold text-betrayal-gold mr-1">{answer}.</span>
                  {opt?.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Player selection */}
      <p className="font-cinzel text-xs uppercase tracking-widest text-betrayal-muted mb-3 text-center">
        Who is this?
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {allPlayers.filter(p => p.id !== currentPlayer.id && !Object.values(guesses).includes(p.id)).map(player => (
          <button
            key={player.id}
            onClick={() => makeGuess(player.id)}
            className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
              guesses[currentSetIdx] === player.id
                ? 'border-betrayal-gold bg-betrayal-gold bg-opacity-10'
                : 'border-betrayal-gray hover:border-betrayal-gray-light'
            }`}
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-betrayal-gray flex-shrink-0">
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
            <span className="font-cinzel text-xs text-betrayal-text truncate">
              {player.alter_ego_name}
            </span>
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-5">
        <button
          onClick={() => setCurrentSetIdx(prev => Math.max(0, prev - 1))}
          disabled={currentSetIdx === 0}
          className="btn-ghost py-2 px-4 flex items-center gap-1 disabled:opacity-30"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <button
          onClick={() => setCurrentSetIdx(prev => Math.min(anonymizedSets.length - 1, prev + 1))}
          disabled={currentSetIdx === anonymizedSets.length - 1}
          className="btn-ghost py-2 px-4 flex items-center gap-1 disabled:opacity-30"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default function FaithfulOrFakeClient({
  gameState,
  currentPlayer,
  myAnswers,
  hasSubmitted,
  anonymizedSets,
  allPlayers,
  myGuesses,
}: FaithfulOrFakeClientProps) {
  const [gs, setGs] = useState(gameState);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('fof-game-state')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_state' },
        (payload) => setGs(payload.new as GameState)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  if (!currentPlayer) {
    return <div className="min-h-screen flex items-center justify-center text-betrayal-muted">No player found</div>;
  }

  if (gs.faithful_or_fake_submissions_closed && anonymizedSets.length > 0) {
    return (
      <MatchingPhase
        currentPlayer={currentPlayer}
        anonymizedSets={anonymizedSets}
        allPlayers={allPlayers}
        myGuesses={myGuesses}
      />
    );
  }

  return (
    <AnswerPhase
      currentPlayer={currentPlayer}
      existingAnswers={myAnswers}
    />
  );
}

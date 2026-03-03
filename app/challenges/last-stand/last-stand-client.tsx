// @ts-nocheck
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Player, LastStandQuestion } from '@/lib/types';
import { Clock, ChevronRight, Trophy, Shield } from 'lucide-react';
import Image from 'next/image';

interface LastStandClientProps {
  currentPlayer: Player | null;
  questions: Omit<LastStandQuestion, 'is_traitor_hint' | 'created_at'>[];
  myResponses: { question_id: number; answer: string }[];
  scores: { player_id: string; score: number; shields_awarded: number; players: { alter_ego_name: string | null; photo_url: string | null } | null }[];
  gameActive: boolean;
}

const TIME_PER_QUESTION = 30; // seconds

function getAvatarInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function LastStandClient({
  currentPlayer,
  questions,
  myResponses,
  scores: initialScores,
}: LastStandClientProps) {
  const supabase = createClient();
  const alreadyDone = myResponses.length > 0;

  const [phase, setPhase] = useState<'intro' | 'playing' | 'waiting' | 'leaderboard'>(
    alreadyDone ? 'waiting' : 'intro'
  );
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [scores, setScores] = useState(initialScores);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const submitAnswer = useCallback(async (qId: number, answer: string) => {
    if (!currentPlayer) return;
    setAnswers(prev => ({ ...prev, [qId]: answer }));

    await (supabase.from('challenge_responses') as any).upsert({
      challenge_type: 'last_stand',
      player_id: currentPlayer.id,
      question_id: qId,
      answer,
    }, { onConflict: 'challenge_type,player_id,question_id' });
  }, [currentPlayer, supabase]);

  const advanceQuestion = useCallback(() => {
    setCurrentQ(prev => {
      if (prev < questions.length - 1) {
        setTimeLeft(TIME_PER_QUESTION);
        return prev + 1;
      } else {
        // Done
        setPhase('waiting');
        if (timerRef.current) clearInterval(timerRef.current);
        return prev;
      }
    });
  }, [questions.length]);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-advance when time runs out (no answer = blank)
          const q = questions[currentQ];
          if (q && !answers[q.question_number]) {
            submitAnswer(q.question_number, '');
          }
          advanceQuestion();
          return TIME_PER_QUESTION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, currentQ, questions, answers, submitAnswer, advanceQuestion]);

  // Subscribe to scores
  useEffect(() => {
    const channel = supabase
      .channel('last-stand-scores')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'challenge_scores' },
        () => {
          supabase
            .from('challenge_scores')
            .select('*, players(alter_ego_name, photo_url)')
            .eq('challenge_type', 'last_stand')
            .order('score', { ascending: false })
            .then(({ data }) => {
              if (data) {
                setScores(data as typeof initialScores);
                setPhase('leaderboard');
              }
            });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, initialScores]);

  function startGame() {
    setPhase('playing');
    setCurrentQ(0);
    setTimeLeft(TIME_PER_QUESTION);
  }

  async function selectOption(optKey: string) {
    if (phase !== 'playing') return;
    const q = questions[currentQ];
    if (!q || answers[q.question_number]) return; // already answered

    await submitAnswer(q.question_number, optKey);
    setTimeout(() => advanceQuestion(), 300);
  }

  // ── INTRO ──────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <p className="font-cinzel text-xs uppercase tracking-[0.3em] text-betrayal-gold mb-4">
            Challenge #5
          </p>
          <h2 className="font-cinzel text-3xl font-black text-betrayal-text uppercase tracking-widest mb-4">
            Last Stand
          </h2>
          <p className="text-betrayal-muted text-sm leading-relaxed mb-2">
            {questions.length} questions. {TIME_PER_QUESTION} seconds each.
          </p>
          <p className="text-betrayal-muted text-sm leading-relaxed mb-8">
            You cannot go back. The answers you give may reveal more than you know.
          </p>
          {questions.length === 0 ? (
            <p className="text-betrayal-muted text-sm border border-betrayal-gray rounded p-4">
              The host has not loaded questions yet. Check back soon.
            </p>
          ) : (
            <button onClick={startGame} className="btn-primary w-full">
              Begin
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────
  if (phase === 'playing') {
    const q = questions[currentQ];
    if (!q) return null;
    const options = [
      { key: 'A', text: q.option_a },
      { key: 'B', text: q.option_b },
      { key: 'C', text: q.option_c },
      { key: 'D', text: q.option_d },
    ];
    const myAnswer = answers[q.question_number];
    const timerPct = (timeLeft / TIME_PER_QUESTION) * 100;

    return (
      <div className="max-w-screen-sm mx-auto px-4 pt-8 pb-20">
        {/* Timer + progress */}
        <div className="flex items-center gap-3 mb-5">
          <div className={`flex items-center gap-1.5 font-cinzel font-bold text-sm ${
            timeLeft <= 5 ? 'text-betrayal-red animate-pulse' : 'text-betrayal-gold'
          }`}>
            <Clock size={16} />
            {timeLeft}s
          </div>
          <div className="flex-1 h-2 bg-betrayal-gray rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                timeLeft <= 5 ? 'bg-betrayal-red' : 'bg-betrayal-gold'
              }`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
          <span className="font-cinzel text-xs text-betrayal-muted">
            {currentQ + 1}/{questions.length}
          </span>
        </div>

        {/* Question */}
        <div className="card p-6 mb-5">
          <p className="font-playfair text-lg text-betrayal-text leading-relaxed" style={{ fontStyle: 'italic' }}>
            {q.question_text}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {options.map((opt) => {
            const isSelected = myAnswer === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => selectOption(opt.key)}
                disabled={!!myAnswer}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-betrayal-gold bg-betrayal-gold bg-opacity-15 text-betrayal-gold'
                    : myAnswer
                    ? 'border-betrayal-gray text-betrayal-muted opacity-50 cursor-not-allowed'
                    : 'border-betrayal-gray hover:border-betrayal-gray-light text-betrayal-text hover:bg-betrayal-gray hover:bg-opacity-30'
                }`}
              >
                <span className="font-cinzel font-bold text-sm mr-3">{opt.key}.</span>
                <span className="text-sm">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {myAnswer && (
          <div className="mt-5 flex justify-center">
            <button
              onClick={advanceQuestion}
              className="flex items-center gap-2 btn-ghost py-2 px-5"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── WAITING ───────────────────────────────────────────────────
  if (phase === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="w-8 h-8 border-2 border-betrayal-gold border-t-transparent rounded-full animate-spin mb-6" />
        <h2 className="font-cinzel text-xl font-bold text-betrayal-gold uppercase tracking-widest mb-2">
          {alreadyDone ? 'Already Submitted' : 'Answers Submitted'}
        </h2>
        <p className="text-betrayal-muted text-sm">
          Waiting for the host to score and reveal results.
        </p>
      </div>
    );
  }

  // ── LEADERBOARD ───────────────────────────────────────────────
  return (
    <div className="max-w-screen-sm mx-auto px-4 pt-8 pb-20">
      <div className="text-center mb-8">
        <Trophy className="text-betrayal-gold mx-auto mb-3" size={36} />
        <h2 className="font-cinzel text-2xl font-bold text-betrayal-gold uppercase tracking-widest">
          Last Stand Results
        </h2>
      </div>

      <div className="space-y-3">
        {scores.map((s, i) => (
          <div
            key={s.player_id}
            className={`card flex items-center gap-3 p-4 ${
              i === 0 ? 'border-betrayal-gold border-opacity-60 shadow-gold' : ''
            }`}
          >
            <span className={`font-cinzel font-black text-xl w-6 text-center ${
              i === 0 ? 'text-betrayal-gold' : 'text-betrayal-muted'
            }`}>{i + 1}</span>
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-betrayal-gray flex-shrink-0">
              {s.players?.photo_url ? (
                <Image src={s.players.photo_url} alt="" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-cinzel text-xs font-bold text-betrayal-muted">
                    {getAvatarInitials(s.players?.alter_ego_name ?? null)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-cinzel font-bold text-sm text-betrayal-text truncate">
                {s.players?.alter_ego_name ?? 'Unknown'}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-cinzel font-bold text-betrayal-gold">{s.score} pts</p>
              {s.shields_awarded > 0 && (
                <div className="flex items-center gap-1 justify-end mt-0.5">
                  <Shield size={12} className="text-betrayal-gold" />
                  <span className="text-xs text-betrayal-gold">+{s.shields_awarded}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {scores.length === 0 && (
          <p className="text-center text-betrayal-muted text-sm py-8">
            No results yet
          </p>
        )}
      </div>
    </div>
  );
}

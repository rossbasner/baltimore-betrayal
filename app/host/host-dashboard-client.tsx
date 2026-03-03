// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import type {
  Player,
  User,
  GameState,
  Roundtable,
  ScheduleEvent,
  LastStandQuestion,
  Announcement,
} from '@/lib/types';
import { SECRET_WORDS } from '@/lib/types';
import {
  Users, Calendar, Vote, Swords, Eye, Skull,
  Plus, Minus, ChevronDown, ChevronUp, CheckCircle,
  SkipForward, BarChart2, Moon, Shield, Edit2, Save, X,
} from 'lucide-react';

interface PlayerWithUser extends Player {
  users: User;
}

interface HostDashboardClientProps {
  players: PlayerWithUser[];
  events: ScheduleEvent[];
  gameState: GameState | null;
  roundtable: Roundtable | null;
  votes: { voter_id: string; voted_for_id: string; voter: { alter_ego_name: string | null } | null }[];
  lastStandQuestions: LastStandQuestion[];
  announcements: Announcement[];
  wordProgress: { player_id: string; word: string }[];
  challengeScores: { player_id: string; score: number; shields_awarded: number; challenge_type: string; players: { alter_ego_name: string | null } | null }[];
  fofResponses: { player_id: string; question_id: number; answer: string; target_player_id: string | null }[];
}

function getAvatarInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const SECTIONS = [
  { id: 'players', label: 'Players', icon: Users },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'voting', label: 'Voting', icon: Vote },
  { id: 'challenges', label: 'Challenges', icon: Swords },
  { id: 'secretword', label: 'Secret Word', icon: Moon },
  { id: 'murder', label: 'Announce', icon: Skull },
];

export default function HostDashboardClient({
  players: initialPlayers,
  events: initialEvents,
  gameState: initialGameState,
  roundtable: initialRoundtable,
  votes: initialVotes,
  lastStandQuestions: initialQuestions,
  wordProgress: initialWordProgress,
  challengeScores: initialScores,
}: HostDashboardClientProps) {
  const supabase = createClient();

  const [activeSection, setActiveSection] = useState('players');
  const [players, setPlayers] = useState(initialPlayers);
  const [events, setEvents] = useState(initialEvents);
  const [gameState, setGameState] = useState(initialGameState);
  const [roundtable, setRoundtable] = useState(initialRoundtable);
  const [votes, setVotes] = useState(initialVotes);
  const [questions, setQuestions] = useState(initialQuestions);
  const [wordProgress, setWordProgress] = useState(initialWordProgress);
  const [challengeScores, setChallengeScores] = useState(initialScores);
  const [murderMessage, setMurderMessage] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<LastStandQuestion>>({
    question_number: (initialQuestions.length + 1),
    question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
    correct_answer: 'A', is_traitor_hint: false,
  });

  const refreshAll = useCallback(async () => {
    const [{ data: p }, { data: e }, { data: gs }, { data: sc }, { data: wp }] = await Promise.all([
      (supabase.from('players') as any).select('*, users!inner(id, email, role)').order('alter_ego_name'),
      (supabase.from('schedule_events') as any).select('*').order('scheduled_time'),
      (supabase.from('game_state') as any).select('*').eq('id', 1).single(),
      (supabase.from('challenge_scores') as any).select('*, players(alter_ego_name)').order('score', { ascending: false }),
      (supabase.from('word_game_progress') as any).select('player_id, word').order('marked_at'),
    ]);
    if (p) setPlayers(p as PlayerWithUser[]);
    if (e) setEvents(e as ScheduleEvent[]);
    if (gs) setGameState(gs as GameState);
    if (sc) setChallengeScores(sc as typeof initialScores);
    if (wp) setWordProgress(wp);
  }, [supabase, initialScores]);

  const refreshRoundtable = useCallback(async (rtId: string | null) => {
    if (!rtId) { setRoundtable(null); setVotes([]); return; }
    const [{ data: rt }, { data: v }] = await Promise.all([
      (supabase.from('roundtables') as any).select('*').eq('id', rtId).single(),
      (supabase.from('votes') as any).select('voter_id, voted_for_id, voter:players!voter_id(alter_ego_name)').eq('roundtable_id', rtId),
    ]);
    if (rt) setRoundtable(rt as Roundtable);
    if (v) setVotes(v as typeof initialVotes);
  }, [supabase, initialVotes]);

  useEffect(() => {
    const channel = supabase
      .channel('host-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
        if (gameState?.active_roundtable_id) refreshRoundtable(gameState.active_roundtable_id);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' }, (payload) => {
        const gs = payload.new as GameState;
        setGameState(gs);
        refreshRoundtable(gs.active_roundtable_id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'word_game_progress' }, refreshAll)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, gameState, refreshAll, refreshRoundtable]);

  // ── PLAYER MANAGEMENT ─────────────────────────────────────────
  async function updateShields(playerId: string, delta: number) {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    const newCount = Math.max(0, player.shield_count + delta);
    await (supabase.from('players') as any).update({ shield_count: newCount }).eq('id', playerId);
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, shield_count: newCount } : p));
  }

  async function updateStatus(playerId: string, status: Player['status']) {
    await (supabase.from('players') as any).update({ status }).eq('id', playerId);
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, status } : p));
  }

  async function updateChallengePoints(playerId: string, points: number) {
    await (supabase.from('players') as any).update({ challenge_points: points }).eq('id', playerId);
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, challenge_points: points } : p));
  }

  // ── SCHEDULE MANAGEMENT ───────────────────────────────────────
  async function setEventStatus(eventId: string, status: ScheduleEvent['status']) {
    // If marking current, reset all others to upcoming first
    if (status === 'current') {
      await (supabase.from('schedule_events') as any).update({ status: 'upcoming' }).neq('id', eventId).eq('status', 'current');
    }
    await (supabase.from('schedule_events') as any).update({ status }).eq('id', eventId);
    setEvents(prev => prev.map(e => {
      if (e.id === eventId) return { ...e, status };
      if (status === 'current' && e.status === 'current') return { ...e, status: 'upcoming' as ScheduleEvent['status'] };
      return e;
    }));
  }

  // ── VOTING MANAGEMENT ─────────────────────────────────────────
  async function openVoting() {
    const roundNumber = (roundtable?.round_number ?? 0) + 1;
    const nonBanishedPlayers = players
      .filter(p => p.users.role !== 'host' && p.status !== 'banished')
      .sort((a, b) => (a.alter_ego_name ?? '').localeCompare(b.alter_ego_name ?? ''));

    const { data: rt } = await supabase
      .from('roundtables')
      .insert({
        round_number: roundNumber,
        status: 'open',
        announcement_order: nonBanishedPlayers.map(p => p.id),
        current_announcement_index: 0,
      })
      .select()
      .single();

    if (rt) {
      await (supabase.from('game_state') as any).update({ active_roundtable_id: rt.id }).eq('id', 1);
      setRoundtable(rt as Roundtable);
      setGameState(prev => prev ? { ...prev, active_roundtable_id: rt.id } : null);
    }
  }

  async function closeVoting() {
    if (!roundtable) return;
    await (supabase.from('roundtables') as any).update({ status: 'announcement', current_announcement_index: 0 }).eq('id', roundtable.id);
    setRoundtable(prev => prev ? { ...prev, status: 'announcement', current_announcement_index: 0 } : null);
  }

  async function advanceAnnouncement() {
    if (!roundtable) return;
    const order = roundtable.announcement_order ?? [];
    const nextIdx = roundtable.current_announcement_index + 1;
    await (supabase.from('roundtables') as any).update({ current_announcement_index: nextIdx }).eq('id', roundtable.id);
    setRoundtable(prev => prev ? { ...prev, current_announcement_index: nextIdx } : null);
  }

  async function revealTally() {
    if (!roundtable) return;
    await (supabase.from('roundtables') as any).update({ status: 'reveal' }).eq('id', roundtable.id);
    setRoundtable(prev => prev ? { ...prev, status: 'reveal' } : null);
  }

  async function closeRoundtable() {
    if (!roundtable) return;
    await (supabase.from('roundtables') as any).update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', roundtable.id);
    await (supabase.from('game_state') as any).update({ active_roundtable_id: null }).eq('id', 1);
    setRoundtable(null);
    setGameState(prev => prev ? { ...prev, active_roundtable_id: null } : null);
  }

  // ── GAME STATE TOGGLES ────────────────────────────────────────
  async function toggleGameState(key: keyof GameState, value: boolean) {
    await (supabase.from('game_state') as any).update({ [key]: value }).eq('id', 1);
    setGameState(prev => prev ? { ...prev, [key]: value } : null);
  }

  // ── MURDER ANNOUNCEMENT ───────────────────────────────────────
  async function sendAnnouncement(type: 'murder' | 'general') {
    if (!murderMessage.trim()) return;
    await (supabase.from('announcements') as any).insert({ message: murderMessage.trim(), type });
    setMurderMessage('');
  }

  // ── LAST STAND QUESTIONS ──────────────────────────────────────
  async function saveQuestion() {
    if (!newQuestion.question_text) return;
    setSaving(true);
    await (supabase.from('last_stand_questions') as any).upsert({
      question_number: newQuestion.question_number!,
      question_text: newQuestion.question_text!,
      option_a: newQuestion.option_a!,
      option_b: newQuestion.option_b!,
      option_c: newQuestion.option_c!,
      option_d: newQuestion.option_d!,
      correct_answer: newQuestion.correct_answer!,
      is_traitor_hint: newQuestion.is_traitor_hint ?? false,
    }, { onConflict: 'question_number' });
    const { data: q } = await (supabase.from('last_stand_questions') as any).select('*').order('question_number');
    if (q) setQuestions(q as LastStandQuestion[]);
    setNewQuestion({ question_number: (q?.length ?? 0) + 1, question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', is_traitor_hint: false });
    setSaving(false);
  }

  async function deleteQuestion(id: string) {
    await (supabase.from('last_stand_questions') as any).delete().eq('id', id);
    setQuestions(prev => prev.filter(q => q.id !== id));
  }

  // ── CHALLENGE SCORES ──────────────────────────────────────────
  async function awardScore(playerId: string, challengeType: string, score: number, shields: number) {
    await (supabase.from('challenge_scores') as any).upsert({
      challenge_type: challengeType,
      player_id: playerId,
      score,
      shields_awarded: shields,
    }, { onConflict: 'challenge_type,player_id' });
    if (shields > 0) {
      const player = players.find(p => p.id === playerId);
      if (player) updateShields(playerId, shields);
    }
  }

  // ── VOTE TALLY ────────────────────────────────────────────────
  const voteTally = votes.reduce<Record<string, number>>((acc, v) => {
    acc[v.voted_for_id] = (acc[v.voted_for_id] ?? 0) + 1;
    return acc;
  }, {});

  const nonBanishedNonHost = players.filter(p => p.users.role !== 'host' && p.status !== 'banished');
  const totalVoters = nonBanishedNonHost.length;

  // ── WORD GAME LEADERBOARD ─────────────────────────────────────
  const limboPlayers = players.filter(p => p.status === 'limbo');
  const wordLeaderboard = limboPlayers.map(p => ({
    player: p,
    count: wordProgress.filter(w => w.player_id === p.id).length,
  })).sort((a, b) => b.count - a.count);

  // ── ANNOUNCEMENT ORDER ────────────────────────────────────────
  const announcementOrder = roundtable?.announcement_order ?? [];
  const currentAnnouncerIdx = roundtable?.current_announcement_index ?? 0;
  const currentAnnouncer = players.find(p => p.id === announcementOrder[currentAnnouncerIdx]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-14 md:w-48 bg-betrayal-dark border-r border-betrayal-gray flex-shrink-0 sticky top-10 h-[calc(100vh-2.5rem)] overflow-y-auto">
        <nav className="py-4">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`w-full flex items-center gap-3 px-3 md:px-4 py-3 transition-colors ${
                activeSection === id
                  ? 'text-betrayal-gold bg-betrayal-gold bg-opacity-10 border-r-2 border-betrayal-gold'
                  : 'text-betrayal-muted hover:text-betrayal-text hover:bg-betrayal-gray hover:bg-opacity-30'
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="hidden md:block font-cinzel text-xs uppercase tracking-widest">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto max-w-3xl">

        {/* ── PLAYERS ─────────────────────────────────────── */}
        {activeSection === 'players' && (
          <div>
            <h2 className="section-title mb-5">Player Management</h2>
            <div className="space-y-3">
              {players.map(player => {
                const isEditing = editingPlayer === player.id;
                return (
                  <div key={player.id} className="card p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-betrayal-gray flex-shrink-0 border border-betrayal-gray-light">
                        {player.photo_url ? (
                          <Image src={player.photo_url} alt="" fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="font-cinzel text-sm font-bold text-betrayal-muted">
                              {getAvatarInitials(player.alter_ego_name)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-cinzel font-bold text-betrayal-text text-sm">
                              {player.alter_ego_name ?? 'Unnamed'}{' '}
                              {player.users.role === 'host' && (
                                <span className="text-betrayal-gold text-xs">(Host)</span>
                              )}
                              {player.users.role === 'admin' && (
                                <span className="text-betrayal-gold text-xs">(Admin)</span>
                              )}
                            </p>
                            <p className="text-betrayal-muted text-xs">{player.real_name}</p>
                            <p className="text-betrayal-muted text-xs">{player.users.email}</p>
                          </div>
                          <button
                            onClick={() => setEditingPlayer(isEditing ? null : player.id)}
                            className="text-betrayal-muted hover:text-betrayal-gold transition-colors flex-shrink-0"
                          >
                            {isEditing ? <X size={16} /> : <Edit2 size={16} />}
                          </button>
                        </div>

                        {player.users.role !== 'host' && (
                          <div className="mt-3 space-y-3">
                            {/* Status */}
                            <div>
                              <label className="label">Status</label>
                              <select
                                value={player.status}
                                onChange={(e) => updateStatus(player.id, e.target.value as Player['status'])}
                                className="input-field text-sm py-2"
                              >
                                <option value="in_game">In Game</option>
                                <option value="murdered">Murdered</option>
                                <option value="banished">Banished</option>
                                <option value="limbo">Limbo</option>
                              </select>
                            </div>

                            {/* Shields */}
                            <div>
                              <label className="label">Shields</label>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateShields(player.id, -1)}
                                  disabled={player.shield_count <= 0}
                                  className="w-8 h-8 rounded bg-betrayal-gray hover:bg-betrayal-gray-light flex items-center justify-center transition-colors disabled:opacity-30"
                                >
                                  <Minus size={14} />
                                </button>
                                <div className="flex items-center gap-1.5 px-3">
                                  <Shield size={14} className="text-betrayal-gold" />
                                  <span className="font-cinzel font-bold text-betrayal-gold w-4 text-center">
                                    {player.shield_count}
                                  </span>
                                </div>
                                <button
                                  onClick={() => updateShields(player.id, 1)}
                                  className="w-8 h-8 rounded bg-betrayal-gray hover:bg-betrayal-gray-light flex items-center justify-center transition-colors"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Challenge Points */}
                            {isEditing && (
                              <div>
                                <label className="label">Challenge Points</label>
                                <input
                                  type="number"
                                  value={player.challenge_points}
                                  onChange={e => updateChallengePoints(player.id, Number(e.target.value))}
                                  className="input-field text-sm py-2 w-24"
                                  min={0}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SCHEDULE ────────────────────────────────────── */}
        {activeSection === 'schedule' && (
          <div>
            <h2 className="section-title mb-5">Schedule Management</h2>
            <div className="space-y-2">
              {events.map(event => (
                <div key={event.id} className="card p-3 flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      event.status === 'current' ? 'bg-betrayal-red animate-pulse' :
                      event.status === 'complete' ? 'bg-green-500' : 'bg-betrayal-muted'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-cinzel text-xs font-semibold ${
                      event.status === 'complete' ? 'text-betrayal-muted line-through' : 'text-betrayal-text'
                    }`}>
                      {event.title}
                    </p>
                    <p className="text-betrayal-muted text-xs">
                      {new Date(event.scheduled_time).toLocaleString('en-US', {
                        weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true
                      })}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {event.status !== 'current' && (
                      <button
                        onClick={() => setEventStatus(event.id, 'current')}
                        className="font-cinzel text-xs text-betrayal-gold border border-betrayal-gold px-2 py-1 rounded hover:bg-betrayal-gold hover:text-betrayal-black transition-colors"
                      >
                        Now
                      </button>
                    )}
                    {event.status !== 'complete' && (
                      <button
                        onClick={() => setEventStatus(event.id, 'complete')}
                        className="font-cinzel text-xs text-green-400 border border-green-700 px-2 py-1 rounded hover:bg-green-900 hover:bg-opacity-30 transition-colors"
                      >
                        <CheckCircle size={12} />
                      </button>
                    )}
                    {event.status === 'complete' && (
                      <button
                        onClick={() => setEventStatus(event.id, 'upcoming')}
                        className="font-cinzel text-xs text-betrayal-muted border border-betrayal-gray px-2 py-1 rounded hover:bg-betrayal-gray transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VOTING ──────────────────────────────────────── */}
        {activeSection === 'voting' && (
          <div>
            <h2 className="section-title mb-5">Roundtable Voting</h2>

            {!roundtable || roundtable.status === 'closed' ? (
              <div className="card p-5">
                <p className="text-betrayal-muted text-sm mb-4">
                  No active roundtable. Open a new voting round.
                </p>
                <button onClick={openVoting} className="btn-primary">
                  Open Voting Round
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status */}
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-betrayal-red animate-pulse" />
                    <p className="font-cinzel text-sm font-bold text-betrayal-gold">
                      Round #{roundtable.round_number} — {roundtable.status.toUpperCase()}
                    </p>
                  </div>
                  <p className="text-betrayal-muted text-sm">
                    {votes.length} / {totalVoters} votes submitted
                  </p>
                  <div className="mt-2 h-1.5 bg-betrayal-gray rounded-full overflow-hidden">
                    <div
                      className="h-full bg-betrayal-red transition-all duration-500"
                      style={{ width: `${totalVoters > 0 ? (votes.length / totalVoters) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Who has voted (names only, not who for) */}
                <div className="card p-4">
                  <p className="label mb-2">Voters</p>
                  <div className="flex flex-wrap gap-1.5">
                    {players
                      .filter(p => p.users.role !== 'host' && p.status !== 'banished')
                      .map(p => {
                        const hasVoted = votes.some(v => v.voter_id === p.id);
                        return (
                          <span
                            key={p.id}
                            className={`font-cinzel text-xs px-2 py-0.5 rounded-full ${
                              hasVoted ? 'bg-green-900 bg-opacity-40 text-green-300 border border-green-700' : 'bg-betrayal-gray text-betrayal-muted'
                            }`}
                          >
                            {p.alter_ego_name ?? p.real_name}
                          </span>
                        );
                      })}
                  </div>
                </div>

                {/* Controls by phase */}
                {roundtable.status === 'open' && (
                  <button onClick={closeVoting} className="btn-primary w-full">
                    Close Voting → Start Announcements
                  </button>
                )}

                {roundtable.status === 'announcement' && (
                  <div className="card p-5 text-center space-y-4">
                    <p className="font-cinzel text-xs uppercase tracking-widest text-betrayal-muted">
                      Announcing — {currentAnnouncerIdx + 1} of {announcementOrder.length}
                    </p>
                    {currentAnnouncer && (
                      <p className="font-cinzel text-xl font-bold text-betrayal-gold">
                        {currentAnnouncer.alter_ego_name}
                      </p>
                    )}
                    <div className="flex gap-3 justify-center">
                      {currentAnnouncerIdx < announcementOrder.length - 1 ? (
                        <button onClick={advanceAnnouncement} className="btn-ghost flex items-center gap-2">
                          <SkipForward size={16} /> Next Player
                        </button>
                      ) : (
                        <button onClick={revealTally} className="btn-primary flex items-center gap-2">
                          <BarChart2 size={16} /> Reveal Tally
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {roundtable.status === 'reveal' && (
                  <div className="space-y-3">
                    <div className="card p-4">
                      <h3 className="font-cinzel text-sm font-bold text-betrayal-gold mb-3">Vote Tally</h3>
                      {Object.entries(voteTally)
                        .sort(([, a], [, b]) => b - a)
                        .map(([pid, count]) => {
                          const player = players.find(p => p.id === pid);
                          const maxV = Math.max(...Object.values(voteTally));
                          return (
                            <div key={pid} className="flex items-center gap-2 mb-2">
                              <p className="font-cinzel text-xs text-betrayal-text flex-1 truncate">
                                {player?.alter_ego_name}
                              </p>
                              <span className={`font-cinzel font-bold text-sm ${
                                count === maxV ? 'text-betrayal-red' : 'text-betrayal-muted'
                              }`}>{count}</span>
                            </div>
                          );
                        })}
                    </div>

                    {/* Who voted for whom */}
                    <div className="card p-4">
                      <h3 className="font-cinzel text-sm font-bold text-betrayal-gold mb-3">
                        <Eye size={14} className="inline mr-1.5" />
                        Full Vote Breakdown
                      </h3>
                      <div className="space-y-1">
                        {votes.map(v => {
                          const target = players.find(p => p.id === v.voted_for_id);
                          return (
                            <p key={v.voter_id} className="text-xs text-betrayal-muted">
                              <span className="text-betrayal-text">{v.voter?.alter_ego_name ?? '?'}</span>
                              {' → '}
                              <span className="text-betrayal-red">{target?.alter_ego_name ?? '?'}</span>
                            </p>
                          );
                        })}
                      </div>
                    </div>

                    <button onClick={closeRoundtable} className="btn-ghost w-full">
                      Close Roundtable
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── CHALLENGES ──────────────────────────────────── */}
        {activeSection === 'challenges' && (
          <div className="space-y-6">
            <h2 className="section-title">Challenge Management</h2>

            {/* Faithful or Fake */}
            <div className="card p-5">
              <h3 className="font-cinzel text-sm font-bold text-betrayal-gold mb-4">Challenge #3 — Faithful or Fake</h3>
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  onClick={() => toggleGameState('faithful_or_fake_active', !gameState?.faithful_or_fake_active)}
                  className={gameState?.faithful_or_fake_active ? 'btn-ghost' : 'btn-primary'}
                >
                  {gameState?.faithful_or_fake_active ? 'Deactivate' : 'Activate'} Game
                </button>
                {gameState?.faithful_or_fake_active && (
                  <button
                    onClick={() => toggleGameState('faithful_or_fake_submissions_closed', !gameState?.faithful_or_fake_submissions_closed)}
                    className="btn-gold"
                  >
                    {gameState?.faithful_or_fake_submissions_closed ? 'Reopen Submissions' : 'Close Submissions → Match Phase'}
                  </button>
                )}
              </div>
              <div className="mt-2 p-3 bg-betrayal-gray bg-opacity-30 rounded text-xs text-betrayal-muted font-cinzel">
                Status:{' '}
                {!gameState?.faithful_or_fake_active ? 'Inactive' :
                 gameState.faithful_or_fake_submissions_closed ? 'Matching Phase' : 'Answering Phase'}
              </div>

              {/* Challenge scores */}
              {challengeScores.filter(s => s.challenge_type === 'faithful_or_fake' || s.challenge_type === 'faithful_or_fake_guess').length > 0 && (
                <div className="mt-4">
                  <h4 className="label mb-2">Current Scores</h4>
                  {challengeScores
                    .filter(s => s.challenge_type.startsWith('faithful'))
                    .map(s => (
                      <div key={s.player_id} className="flex justify-between text-sm py-1">
                        <span className="text-betrayal-text text-xs">{s.players?.alter_ego_name}</span>
                        <span className="text-betrayal-gold font-cinzel font-bold text-xs">{s.score} pts</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Last Stand */}
            <div className="card p-5">
              <h3 className="font-cinzel text-sm font-bold text-betrayal-gold mb-4">Challenge #5 — Last Stand</h3>

              <div className="flex gap-3 mb-5">
                <button
                  onClick={() => toggleGameState('last_stand_active', !gameState?.last_stand_active)}
                  className={gameState?.last_stand_active ? 'btn-ghost' : 'btn-primary'}
                >
                  {gameState?.last_stand_active ? 'Deactivate' : 'Activate'} Game
                </button>
              </div>

              {/* Questions list */}
              <div className="mb-4 space-y-2">
                <h4 className="label">Questions ({questions.length}/15)</h4>
                {questions.map(q => (
                  <div key={q.id} className="flex items-start gap-2 p-3 bg-betrayal-gray bg-opacity-30 rounded">
                    <span className="font-cinzel font-bold text-betrayal-gold text-sm flex-shrink-0">
                      {q.question_number}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-betrayal-text text-xs line-clamp-2">{q.question_text}</p>
                      <p className="text-betrayal-muted text-xs mt-0.5">
                        Answer: {q.correct_answer}
                        {q.is_traitor_hint && ' · 🎯 Traitor Hint'}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="text-betrayal-muted hover:text-betrayal-red transition-colors flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add question form */}
              {questions.length < 15 && (
                <div className="border border-betrayal-gray rounded-lg p-4 space-y-3">
                  <h4 className="label">Add Question #{newQuestion.question_number}</h4>
                  <div>
                    <label className="label">Question Text</label>
                    <textarea
                      value={newQuestion.question_text}
                      onChange={e => setNewQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                      className="input-field text-sm resize-none"
                      rows={2}
                      placeholder="Enter question…"
                    />
                  </div>
                  {(['A', 'B', 'C', 'D'] as const).map(key => (
                    <div key={key}>
                      <label className="label">Option {key}</label>
                      <input
                        type="text"
                        value={(newQuestion as Record<string, unknown>)[`option_${key.toLowerCase()}`] as string ?? ''}
                        onChange={e => setNewQuestion(prev => ({ ...prev, [`option_${key.toLowerCase()}`]: e.target.value }))}
                        className="input-field text-sm py-2"
                        placeholder={`Option ${key}…`}
                      />
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="label">Correct Answer</label>
                      <select
                        value={newQuestion.correct_answer}
                        onChange={e => setNewQuestion(prev => ({ ...prev, correct_answer: e.target.value as 'A'|'B'|'C'|'D' }))}
                        className="input-field text-sm py-2"
                      >
                        {(['A','B','C','D'] as const).map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="label">Traitor Hint?</label>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newQuestion.is_traitor_hint ?? false}
                          onChange={e => setNewQuestion(prev => ({ ...prev, is_traitor_hint: e.target.checked }))}
                          className="w-4 h-4 accent-betrayal-red"
                        />
                        <span className="text-betrayal-muted text-xs font-cinzel uppercase tracking-widest">Yes (host only)</span>
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={saveQuestion}
                    disabled={saving || !newQuestion.question_text}
                    className="btn-gold w-full flex items-center justify-center gap-2"
                  >
                    <Save size={14} />
                    {saving ? 'Saving…' : 'Add Question'}
                  </button>
                </div>
              )}

              {/* Last Stand scores */}
              {challengeScores.filter(s => s.challenge_type === 'last_stand').length > 0 && (
                <div className="mt-4">
                  <h4 className="label mb-2">Results</h4>
                  {challengeScores
                    .filter(s => s.challenge_type === 'last_stand')
                    .map(s => (
                      <div key={s.player_id} className="flex justify-between text-xs py-1">
                        <span className="text-betrayal-text">{s.players?.alter_ego_name}</span>
                        <span className="text-betrayal-gold font-cinzel font-bold">{s.score} pts</span>
                      </div>
                    ))}

                  {/* Award shields from results */}
                  <div className="mt-3 pt-3 border-t border-betrayal-gray">
                    <p className="label mb-2">Award Shields</p>
                    <div className="flex flex-wrap gap-2">
                      {challengeScores.filter(s => s.challenge_type === 'last_stand').slice(0, 3).map(s => (
                        <button
                          key={s.player_id}
                          onClick={() => awardScore(s.player_id, 'last_stand', s.score, 1)}
                          className="font-cinzel text-xs text-betrayal-gold border border-betrayal-gold px-3 py-1 rounded hover:bg-betrayal-gold hover:text-betrayal-black transition-colors"
                        >
                          +1 Shield → {s.players?.alter_ego_name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SECRET WORD GAME ─────────────────────────────── */}
        {activeSection === 'secretword' && (
          <div>
            <h2 className="section-title mb-5">Secret Word Game</h2>

            <div className="card p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-cinzel text-sm text-betrayal-text">Game Status</p>
                  <p className={`font-cinzel text-xs uppercase tracking-widest mt-0.5 ${
                    gameState?.secret_word_game_active ? 'text-green-400' : 'text-betrayal-muted'
                  }`}>
                    {gameState?.secret_word_game_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <button
                  onClick={() => toggleGameState('secret_word_game_active', !gameState?.secret_word_game_active)}
                  className={gameState?.secret_word_game_active ? 'btn-ghost' : 'btn-primary'}
                >
                  {gameState?.secret_word_game_active ? 'Close Game' : 'Activate Game'}
                </button>
              </div>

              <p className="text-betrayal-muted text-xs">
                Active from 10:30 PM — 12:00 AM Saturday.
                Only visible to players in LIMBO status.
              </p>
            </div>

            {/* Limbo player standings */}
            <div className="card p-5">
              <h3 className="font-cinzel text-sm font-bold text-betrayal-gold mb-4">
                Limbo Player Standings
              </h3>

              {wordLeaderboard.length === 0 ? (
                <p className="text-betrayal-muted text-sm">No limbo players yet</p>
              ) : (
                <div className="space-y-3">
                  {wordLeaderboard.map(({ player, count }, i) => (
                    <div key={player.id} className="flex items-center gap-3">
                      <span className="font-cinzel font-black text-betrayal-muted w-4">{i + 1}</span>
                      <div className="flex-1">
                        <p className="font-cinzel text-xs text-betrayal-text">{player.alter_ego_name}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {SECRET_WORDS.map(word => {
                            const marked = wordProgress.some(
                              w => w.player_id === player.id && w.word === word
                            );
                            return (
                              <span
                                key={word}
                                className={`text-xs px-1 rounded ${
                                  marked ? 'bg-purple-800 text-purple-200' : 'bg-betrayal-gray text-betrayal-muted'
                                }`}
                              >
                                {word}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-cinzel font-bold text-purple-300 text-lg">{count}</span>
                        <span className="text-purple-600 text-xs">/{SECRET_WORDS.length}</span>
                      </div>
                      {i === 0 && count > 0 && (
                        <button
                          onClick={() => updateStatus(player.id, 'in_game')}
                          className="font-cinzel text-xs text-green-400 border border-green-700 px-2 py-1 rounded hover:bg-green-900 hover:bg-opacity-30 transition-colors whitespace-nowrap"
                        >
                          Reinstate
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MURDER ANNOUNCEMENT ──────────────────────────── */}
        {activeSection === 'murder' && (
          <div>
            <h2 className="section-title mb-5">Announcements</h2>

            <div className="card p-5 mb-5">
              <h3 className="font-cinzel text-sm font-bold text-betrayal-red mb-4 flex items-center gap-2">
                <Skull size={16} />
                Murder Announcement
              </h3>
              <p className="text-betrayal-muted text-xs mb-3">
                This will display as a dramatic full-screen overlay to all connected players.
              </p>
              <div className="mb-3">
                <label className="label">Message</label>
                <textarea
                  value={murderMessage}
                  onChange={e => setMurderMessage(e.target.value)}
                  className="input-field resize-none"
                  rows={4}
                  placeholder="e.g. In the darkness of the night, a soul was taken. [Player Name] was found at dawn — cold, still, and silent…"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => sendAnnouncement('murder')}
                  disabled={!murderMessage.trim()}
                  className="btn-primary flex items-center gap-2 flex-1"
                >
                  <Skull size={16} />
                  Send Murder Announcement
                </button>
                <button
                  onClick={() => sendAnnouncement('general')}
                  disabled={!murderMessage.trim()}
                  className="btn-ghost flex items-center gap-2"
                >
                  Send General
                </button>
              </div>
            </div>

            {/* Limbo special reveal */}
            <div className="card p-5 border-purple-900 border-opacity-40">
              <h3 className="font-cinzel text-sm font-bold text-purple-300 mb-3 flex items-center gap-2">
                <Moon size={16} />
                Limbo Special Reveal
              </h3>
              <p className="text-betrayal-muted text-xs mb-3">
                Use if a limbo player receives the most votes at roundtable.
              </p>
              <button
                onClick={() => {
                  setMurderMessage('The castle has spoken — but the Traitors spoke first. This player was already taken in the night. Your vote is wasted.');
                }}
                className="font-cinzel text-xs text-purple-400 border border-purple-700 px-4 py-2 rounded hover:bg-purple-900 hover:bg-opacity-20 transition-colors"
              >
                Load Limbo Message Template
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

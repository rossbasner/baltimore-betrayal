// @ts-nocheck
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { GameState, ScheduleEvent, EventDay } from '@/lib/types';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { Clock, CheckCircle, Circle, ChevronRight, Skull } from 'lucide-react';

interface HomeClientProps {
  events: ScheduleEvent[];
  gameState: GameState | null;
}

function Countdown({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function update() {
      if (isPast(targetDate)) {
        setTimeLeft('Now');
        return;
      }
      setTimeLeft(formatDistanceToNow(targetDate, { addSuffix: false }));
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <span className="font-cinzel text-betrayal-gold text-lg font-bold">
      {timeLeft}
    </span>
  );
}

const DAY_LABELS: Record<EventDay, string> = {
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const DAY_ORDER: EventDay[] = ['friday', 'saturday', 'sunday'];

function EventRow({ event, isCurrent }: { event: ScheduleEvent; isCurrent: boolean }) {
  const time = new Date(event.scheduled_time);
  const complete = event.status === 'complete';

  return (
    <div
      className={`flex items-start gap-3 py-3 px-3 rounded-lg transition-all ${
        isCurrent
          ? 'bg-betrayal-red bg-opacity-15 border border-betrayal-red border-opacity-30'
          : complete
          ? 'opacity-40'
          : 'hover:bg-betrayal-gray hover:bg-opacity-40'
      }`}
    >
      <div className="mt-0.5 flex-shrink-0">
        {complete ? (
          <CheckCircle size={16} className="text-betrayal-muted" />
        ) : isCurrent ? (
          <div className="w-4 h-4 rounded-full bg-betrayal-red animate-pulse" />
        ) : (
          <Circle size={16} className="text-betrayal-muted" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`font-cinzel text-sm font-semibold leading-tight ${
              isCurrent ? 'text-betrayal-gold' : complete ? 'text-betrayal-muted' : 'text-betrayal-text'
            }`}
          >
            {event.title}
          </span>
          {isCurrent && (
            <span className="flex-shrink-0 font-cinzel text-xs text-betrayal-red uppercase tracking-widest animate-pulse">
              Now
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Clock size={11} className="text-betrayal-muted flex-shrink-0" />
          <span className="text-betrayal-muted text-xs">
            {format(time, 'h:mm a')}
          </span>
        </div>
      </div>
      {isCurrent && <ChevronRight size={16} className="text-betrayal-red flex-shrink-0 mt-0.5" />}
    </div>
  );
}

export default function HomeClient({ events: initialEvents, gameState: initialGameState }: HomeClientProps) {
  const [events, setEvents] = useState(initialEvents);
  const [gameState, setGameState] = useState(initialGameState);
  const [activeDay, setActiveDay] = useState<EventDay>('friday');
  const supabase = createClient();

  // Determine current event (the most recent past event that isn't marked complete yet, or the current one)
  const now = new Date();
  const currentEvent = events.find(e => e.status === 'current');
  const nextEvent = events.find(e => e.status === 'upcoming' && new Date(e.scheduled_time) > now);

  const getDayEvents = useCallback((day: EventDay) => {
    return events.filter(e => e.day === day);
  }, [events]);

  // Auto-select the active day
  useEffect(() => {
    const currentOrNext = currentEvent ?? nextEvent;
    if (currentOrNext) {
      setActiveDay(currentOrNext.day as EventDay);
    }
  }, [currentEvent, nextEvent]);

  // Real-time subscription to schedule events and game state
  useEffect(() => {
    const eventsChannel = supabase
      .channel('schedule-events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_events' },
        () => {
          supabase
            .from('schedule_events')
            .select('*')
            .order('scheduled_time', { ascending: true })
            .then(({ data }) => { if (data) setEvents(data as ScheduleEvent[]); });
        }
      )
      .subscribe();

    const gsChannel = supabase
      .channel('game-state-home')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_state' },
        (payload) => setGameState(payload.new as GameState)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(gsChannel);
    };
  }, [supabase]);

  return (
    <div className="max-w-screen-sm mx-auto px-4 pt-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-3">
          <Skull className="text-betrayal-red candle-flicker" size={40} />
        </div>
        <h1 className="font-cinzel text-2xl md:text-3xl font-black text-betrayal-gold text-glow-gold uppercase tracking-widest leading-tight">
          2nd Annual<br />Baltimore Betrayal
        </h1>
        <div className="mt-3 flex justify-center">
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-betrayal-gold to-transparent" />
        </div>
      </div>

      {/* Next event countdown */}
      {nextEvent && (
        <div className="card border-betrayal-gold border-opacity-30 p-5 mb-6 text-center">
          <p className="font-cinzel text-xs uppercase tracking-[0.3em] text-betrayal-muted mb-2">
            Next Event In
          </p>
          <Countdown targetDate={new Date(nextEvent.scheduled_time)} />
          <p className="font-cinzel text-sm text-betrayal-text mt-1">
            {nextEvent.title}
          </p>
          <p className="text-betrayal-muted text-xs mt-1">
            {format(new Date(nextEvent.scheduled_time), 'EEEE h:mm a')}
          </p>
        </div>
      )}

      {/* Current event highlight */}
      {currentEvent && (
        <div className="bg-betrayal-red bg-opacity-10 border border-betrayal-red border-opacity-40 rounded-lg p-4 mb-6 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-betrayal-red animate-pulse flex-shrink-0" />
          <div>
            <p className="font-cinzel text-xs uppercase tracking-widest text-betrayal-red mb-0.5">
              Happening Now
            </p>
            <p className="font-cinzel text-sm font-bold text-betrayal-text">
              {currentEvent.title}
            </p>
          </div>
        </div>
      )}

      {/* Day tabs */}
      <div className="flex border-b border-betrayal-gray mb-4">
        {DAY_ORDER.map((day) => {
          const dayEvents = getDayEvents(day);
          const hasEvents = dayEvents.length > 0;
          if (!hasEvents) return null;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex-1 py-2.5 font-cinzel text-xs uppercase tracking-widest transition-colors ${
                activeDay === day
                  ? 'text-betrayal-gold border-b-2 border-betrayal-gold -mb-px'
                  : 'text-betrayal-muted hover:text-betrayal-text'
              }`}
            >
              {DAY_LABELS[day]}
            </button>
          );
        })}
      </div>

      {/* Events for selected day */}
      <div className="space-y-0.5 mb-8">
        {getDayEvents(activeDay).map((event) => (
          <EventRow
            key={event.id}
            event={event}
            isCurrent={event.status === 'current'}
          />
        ))}
        {getDayEvents(activeDay).length === 0 && (
          <p className="text-betrayal-muted text-center py-8 text-sm">
            No events scheduled
          </p>
        )}
      </div>

      <div className="text-center pb-4">
        <p className="font-cinzel text-xs uppercase tracking-widest text-betrayal-muted">
          Trust No One
        </p>
      </div>
    </div>
  );
}

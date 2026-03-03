// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ScheduleEvent, EventDay } from '@/lib/types';
import { format } from 'date-fns';
import { Clock, CheckCircle, Circle, Calendar } from 'lucide-react';

const DAY_LABELS: Record<EventDay, string> = {
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const DAY_ORDER: EventDay[] = ['friday', 'saturday', 'sunday'];

function EventRow({ event }: { event: ScheduleEvent }) {
  const time = new Date(event.scheduled_time);
  const isCurrent = event.status === 'current';
  const isComplete = event.status === 'complete';

  return (
    <div
      className={`flex items-start gap-3 py-3 px-3 rounded-lg transition-all ${
        isCurrent
          ? 'bg-betrayal-red bg-opacity-15 border border-betrayal-red border-opacity-30'
          : isComplete
          ? 'opacity-40'
          : 'hover:bg-betrayal-gray hover:bg-opacity-40'
      }`}
    >
      <div className="mt-0.5 flex-shrink-0">
        {isComplete ? (
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
              isCurrent ? 'text-betrayal-gold' : isComplete ? 'text-betrayal-muted' : 'text-betrayal-text'
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
    </div>
  );
}

export default function ItineraryClient({ events: initialEvents }: { events: ScheduleEvent[] }) {
  const [events, setEvents] = useState(initialEvents);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('itinerary-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_events' }, () => {
        supabase
          .from('schedule_events')
          .select('*')
          .order('day')
          .order('sort_order')
          .order('scheduled_time')
          .then(({ data }) => { if (data) setEvents(data as ScheduleEvent[]); });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const getDayEvents = (day: EventDay) => events.filter(e => e.day === day);
  const days = DAY_ORDER.filter(d => getDayEvents(d).length > 0);

  return (
    <div className="max-w-screen-sm mx-auto px-4 pt-8 pb-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <Calendar className="text-betrayal-gold" size={32} />
        </div>
        <h1 className="font-cinzel text-2xl font-bold text-betrayal-gold uppercase tracking-widest">
          Weekend Itinerary
        </h1>
        <div className="mt-3 flex justify-center">
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-betrayal-gold to-transparent" />
        </div>
      </div>

      {days.length === 0 ? (
        <p className="text-center text-betrayal-muted py-16 text-sm">
          No events scheduled yet.
        </p>
      ) : (
        <div className="space-y-8">
          {days.map(day => (
            <div key={day}>
              {/* Day header */}
              <div className="font-cinzel text-xs uppercase tracking-[0.3em] text-betrayal-muted mb-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-betrayal-gray" />
                {DAY_LABELS[day]}
                <div className="h-px flex-1 bg-betrayal-gray" />
              </div>

              <div className="space-y-0.5">
                {getDayEvents(day).map(event => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

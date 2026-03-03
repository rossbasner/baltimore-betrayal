// @ts-nocheck
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Announcement } from '@/lib/types';

export default function MurderAnnouncement() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const supabase = createClient();

  const dismiss = useCallback(() => {
    if (announcement) {
      setDismissed(prev => new Set([...prev, announcement.id]));
      setVisible(false);
    }
  }, [announcement]);

  useEffect(() => {
    // Subscribe to new announcements
    const channel = supabase
      .channel('announcements')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          const newAnnouncement = payload.new as Announcement;
          if (!dismissed.has(newAnnouncement.id)) {
            setAnnouncement(newAnnouncement);
            setVisible(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, dismissed]);

  if (!visible || !announcement) return null;

  const isMurder = announcement.type === 'murder';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: isMurder
          ? 'radial-gradient(ellipse at center, rgba(80,0,0,0.97) 0%, rgba(0,0,0,0.99) 100%)'
          : 'radial-gradient(ellipse at center, rgba(20,20,20,0.97) 0%, rgba(0,0,0,0.99) 100%)',
      }}
    >
      {/* Background particles / atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isMurder && (
          <>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-betrayal-red to-transparent opacity-60" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-betrayal-red to-transparent opacity-60" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,0,0,0.15)_0%,transparent_70%)]" />
          </>
        )}
      </div>

      <div className="relative z-10 max-w-2xl w-full mx-4 text-center animate-dramatic-reveal">
        {isMurder && (
          <div className="mb-8">
            <div className="text-8xl mb-4 animate-pulse">🗡️</div>
          </div>
        )}

        <div
          className={`font-cinzel text-xs uppercase tracking-[0.4em] mb-6 ${
            isMurder ? 'text-betrayal-red' : 'text-betrayal-gold'
          }`}
        >
          {isMurder ? '— Murder in the Night —' : '— Announcement —'}
        </div>

        <div
          className={`font-playfair text-2xl md:text-4xl leading-relaxed mb-10 ${
            isMurder ? 'text-betrayal-text text-glow-red' : 'text-betrayal-gold text-glow-gold'
          }`}
          style={{ fontStyle: 'italic' }}
        >
          {announcement.message}
        </div>

        {isMurder && (
          <div className="flex justify-center gap-2 mb-8">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-px h-8 bg-betrayal-red opacity-60"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        )}

        <button
          onClick={dismiss}
          className="font-cinzel text-xs uppercase tracking-[0.3em] text-betrayal-muted hover:text-betrayal-text transition-colors duration-300 border border-betrayal-gray px-8 py-3 rounded hover:border-betrayal-muted"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

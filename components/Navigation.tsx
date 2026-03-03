// @ts-nocheck
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { GameState, UserRole } from '@/lib/types';
import {
  Home,
  Users,
  Trophy,
  Swords,
  Vote,
  LayoutDashboard,
} from 'lucide-react';

interface NavProps {
  userRole: UserRole;
  votingActive?: boolean;
}

export default function Navigation({ userRole, votingActive: initialVoting }: NavProps) {
  const pathname = usePathname();
  const [votingActive, setVotingActive] = useState(initialVoting ?? false);
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to game state changes to show/hide Vote tab
    const channel = supabase
      .channel('game-state-nav')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_state' },
        (payload) => {
          const gs = payload.new as GameState;
          setVotingActive(!!gs.active_roundtable_id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/players', label: 'Players', icon: Users },
    { href: '/leaderboard', label: 'Shields', icon: Trophy },
    { href: '/challenges', label: 'Challenges', icon: Swords },
    ...(votingActive ? [{ href: '/roundtable', label: 'Vote', icon: Vote }] : []),
  ];

  const isHostOrAdmin = userRole === 'host' || userRole === 'admin';

  return (
    <>
      {/* Top bar — host/admin only */}
      {isHostOrAdmin && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-betrayal-dark border-b border-betrayal-gray">
          <div className="max-w-screen-lg mx-auto px-4 py-2 flex items-center justify-between">
            <span className="font-cinzel text-xs uppercase tracking-widest text-betrayal-gold">
              Host Dashboard
            </span>
            <Link
              href="/host"
              className="flex items-center gap-1.5 font-cinzel text-xs uppercase tracking-widest text-betrayal-gold hover:text-betrayal-gold-light transition-colors"
            >
              <LayoutDashboard size={14} />
              Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-40 bg-betrayal-dark border-t border-betrayal-gray ${
          isHostOrAdmin ? '' : ''
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-screen-lg mx-auto">
          <div className="flex items-stretch">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors duration-200 ${
                    isActive
                      ? 'text-betrayal-gold border-t-2 border-betrayal-gold'
                      : 'text-betrayal-muted hover:text-betrayal-text border-t-2 border-transparent'
                  } ${
                    label === 'Vote' && votingActive
                      ? 'relative after:absolute after:top-2 after:right-1/4 after:w-2 after:h-2 after:bg-betrayal-red after:rounded-full after:animate-pulse'
                      : ''
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-cinzel text-[10px] uppercase tracking-widest">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}

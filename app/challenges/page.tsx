// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import AppShell from '../app-shell';
import Link from 'next/link';
import type { UserRole } from '@/lib/types';
import { Lock, ChevronRight } from 'lucide-react';

export const revalidate = 0;

export default async function ChallengesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const admin = createAdminClient();
  const { data: userData } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = (userData?.role ?? 'player') as UserRole;

  const { data: gameState } = await admin
    .from('game_state')
    .select('*')
    .eq('id', 1)
    .single();

  const challenges = [
    {
      slug: 'faithful-or-fake',
      title: 'Faithful or Fake',
      description: 'Answer scenario questions. Then unmask your fellow players by matching anonymous answers to names.',
      active: gameState?.faithful_or_fake_active ?? false,
      number: '03',
    },
    {
      slug: 'last-stand',
      title: 'Last Stand',
      description: 'A timed memory and deduction challenge. Clues about the weekend — and perhaps the Traitors themselves.',
      active: gameState?.last_stand_active ?? false,
      number: '05',
    },
  ];

  return (
    <AppShell userRole={userRole} votingActive={!!gameState?.active_roundtable_id}>
      <div className="max-w-screen-sm mx-auto px-4 pt-8">
        <div className="text-center mb-8">
          <h1 className="font-cinzel text-2xl font-bold text-betrayal-gold uppercase tracking-widest mb-1">
            Challenges
          </h1>
          <p className="text-betrayal-muted text-sm">
            The host activates each challenge when it begins
          </p>
        </div>

        <div className="space-y-4">
          {challenges.map((c) => (
            <div key={c.slug} className="relative">
              {c.active ? (
                <Link
                  href={`/challenges/${c.slug}`}
                  className="card border-betrayal-gold border-opacity-50 p-5 flex items-center gap-4 hover:border-betrayal-gold transition-colors group block"
                >
                  <div className="font-cinzel font-black text-3xl text-betrayal-gold text-glow-gold opacity-40">
                    {c.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-cinzel font-bold text-betrayal-gold uppercase tracking-widest text-sm mb-1">
                      {c.title}
                    </h2>
                    <p className="text-betrayal-muted text-xs leading-relaxed">
                      {c.description}
                    </p>
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 font-cinzel text-xs text-green-400 uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Active — Enter Now
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="text-betrayal-gold flex-shrink-0 group-hover:translate-x-1 transition-transform" size={20} />
                </Link>
              ) : (
                <div className="card p-5 flex items-center gap-4 opacity-50">
                  <div className="font-cinzel font-black text-3xl text-betrayal-muted opacity-40">
                    {c.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-cinzel font-bold text-betrayal-muted uppercase tracking-widest text-sm mb-1">
                      {c.title}
                    </h2>
                    <p className="text-betrayal-muted text-xs leading-relaxed">
                      {c.description}
                    </p>
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1.5 font-cinzel text-xs text-betrayal-muted uppercase tracking-widest">
                        <Lock size={11} />
                        Not Yet Active
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 card p-4 border-betrayal-gray-light">
          <p className="font-cinzel text-xs uppercase tracking-widest text-betrayal-muted mb-2">Other Challenges</p>
          <div className="space-y-2">
            {[
              { number: '01', title: 'Web of Lies', note: 'Played live — no app required' },
              { number: '02', title: "Traitor's Gauntlet (Codenames)", note: 'Played live — no app required' },
              { number: '04', title: "Saboteur's Trivia", note: 'Played live — no app required' },
            ].map(item => (
              <div key={item.number} className="flex items-center gap-3 opacity-40">
                <span className="font-cinzel font-black text-betrayal-muted text-lg">{item.number}</span>
                <div>
                  <p className="font-cinzel text-xs text-betrayal-muted">{item.title}</p>
                  <p className="text-betrayal-muted text-xs opacity-70">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-8" />
      </div>
    </AppShell>
  );
}

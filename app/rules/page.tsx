// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '../app-shell';
import type { UserRole } from '@/lib/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { Shield, Skull, Vote, Swords, Eye, Crown } from 'lucide-react';

export const revalidate = 0;

export default async function RulesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  const userRole = (userData?.role ?? 'player') as UserRole;

  const admin = createAdminClient();
  const { data: gameState } = await admin.from('game_state').select('active_roundtable_id').eq('id', 1).single();

  return (
    <AppShell userRole={userRole} votingActive={!!gameState?.active_roundtable_id}>
      <div className="max-w-screen-sm mx-auto px-4 pt-8 pb-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-3">
            <Eye className="text-betrayal-gold" size={32} />
          </div>
          <h1 className="font-cinzel text-2xl font-bold text-betrayal-gold uppercase tracking-widest">
            Rules of the Game
          </h1>
          <div className="mt-3 flex justify-center">
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-betrayal-gold to-transparent" />
          </div>
          <p className="text-betrayal-muted text-sm mt-4 font-playfair italic">
            Trust no one. Deceive everyone. Survive at all costs.
          </p>
        </div>

        <div className="space-y-6">

          {/* The Setup */}
          <section className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="text-betrayal-gold flex-shrink-0" size={20} />
              <h2 className="font-cinzel font-bold text-betrayal-gold uppercase tracking-widest text-sm">
                The Setup
              </h2>
            </div>
            <div className="space-y-2 text-betrayal-text text-sm leading-relaxed">
              <p>
                At the start of the weekend, the host secretly assigns each player one of two roles:
              </p>
              <ul className="space-y-2 mt-3">
                <li className="flex gap-3">
                  <span className="text-betrayal-gold font-cinzel font-bold flex-shrink-0">Faithful</span>
                  <span className="text-betrayal-muted">You don't know who the Traitors are. Work together to identify and banish them before it's too late.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-betrayal-red font-cinzel font-bold flex-shrink-0">Traitor</span>
                  <span className="text-betrayal-muted">You know your fellow Traitors. Blend in, deceive the Faithfuls, and avoid being banished.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* The Roundtable */}
          <section className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <Vote className="text-betrayal-gold flex-shrink-0" size={20} />
              <h2 className="font-cinzel font-bold text-betrayal-gold uppercase tracking-widest text-sm">
                The Roundtable
              </h2>
            </div>
            <div className="space-y-2 text-betrayal-text text-sm leading-relaxed">
              <p>Each round, players gather at the roundtable to vote one person out of the game.</p>
              <ul className="mt-3 space-y-2 text-betrayal-muted">
                <li className="flex gap-2"><span className="text-betrayal-gold">1.</span> The host opens voting — tap any player card to cast your vote.</li>
                <li className="flex gap-2"><span className="text-betrayal-gold">2.</span> You can change your vote at any time while voting is open.</li>
                <li className="flex gap-2"><span className="text-betrayal-gold">3.</span> When the host closes voting, each player announces their vote aloud.</li>
                <li className="flex gap-2"><span className="text-betrayal-gold">4.</span> The player with the most votes is <span className="font-cinzel text-betrayal-red">banished</span> from the castle.</li>
                <li className="flex gap-2"><span className="text-betrayal-gold">5.</span> In the event of a tie, the host decides who is banished.</li>
              </ul>
            </div>
          </section>

          {/* Murder */}
          <section className="card p-5 border-betrayal-red border-opacity-30">
            <div className="flex items-center gap-3 mb-4">
              <Skull className="text-betrayal-red flex-shrink-0" size={20} />
              <h2 className="font-cinzel font-bold text-betrayal-red uppercase tracking-widest text-sm">
                The Murder
              </h2>
            </div>
            <div className="space-y-2 text-betrayal-text text-sm leading-relaxed">
              <p>
                Each night, the Traitors secretly choose one Faithful to murder. That player is eliminated
                from the game and their identity is revealed to everyone at the start of the next day.
              </p>
              <p className="text-betrayal-muted mt-2">
                Murdered players cannot vote or be voted for at future roundtables.
              </p>
            </div>
          </section>

          {/* Shields */}
          <section className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-betrayal-gold flex-shrink-0" size={20} />
              <h2 className="font-cinzel font-bold text-betrayal-gold uppercase tracking-widest text-sm">
                Shields
              </h2>
            </div>
            <div className="space-y-2 text-betrayal-text text-sm leading-relaxed">
              <p>
                Shields protect you from being murdered in the night. If the Traitors target a
                player who holds a shield, the murder is blocked and the shield is consumed.
              </p>
              <p className="text-betrayal-muted mt-2">
                Shields are earned by performing well in challenges. Check the{' '}
                <span className="font-cinzel text-betrayal-gold">Shields</span>{' '}
                tab to see the current standings.
              </p>
            </div>
          </section>

          {/* Challenges */}
          <section className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <Swords className="text-betrayal-gold flex-shrink-0" size={20} />
              <h2 className="font-cinzel font-bold text-betrayal-gold uppercase tracking-widest text-sm">
                Challenges
              </h2>
            </div>
            <div className="space-y-2 text-betrayal-text text-sm leading-relaxed">
              <p>Throughout the weekend, challenges are held to earn shields and challenge points.</p>
              <ul className="mt-3 space-y-3 text-betrayal-muted">
                <li>
                  <span className="font-cinzel text-betrayal-text">Faithful or Fake</span>
                  <p className="mt-0.5">Answer questions about yourself honestly — or lie. Other players then try to guess which answers are true. Points for successful deception and correct guesses.</p>
                </li>
                <li>
                  <span className="font-cinzel text-betrayal-text">Last Stand</span>
                  <p className="mt-0.5">A timed trivia quiz. Answer as many questions correctly as possible before time runs out. Top scorers earn shields.</p>
                </li>
              </ul>
            </div>
          </section>

          {/* Winning */}
          <section className="card p-5 border-betrayal-gold border-opacity-30">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="text-betrayal-gold flex-shrink-0" size={20} />
              <h2 className="font-cinzel font-bold text-betrayal-gold uppercase tracking-widest text-sm">
                How to Win
              </h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <span className="font-cinzel font-bold text-betrayal-gold flex-shrink-0">Faithfuls win</span>
                <span className="text-betrayal-muted">if all Traitors are banished from the castle before the game ends.</span>
              </div>
              <div className="flex gap-3">
                <span className="font-cinzel font-bold text-betrayal-red flex-shrink-0">Traitors win</span>
                <span className="text-betrayal-muted">if they outnumber the Faithfuls, or if they survive to the final round.</span>
              </div>
            </div>
          </section>

        </div>

        <div className="text-center mt-10">
          <p className="font-cinzel text-xs uppercase tracking-widest text-betrayal-muted">
            Trust No One
          </p>
        </div>
      </div>
    </AppShell>
  );
}

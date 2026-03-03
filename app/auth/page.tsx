// @ts-nocheck
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Skull } from 'lucide-react';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email for a confirmation link, then sign in.');
        setMode('signin');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else if (data.user) {
        // Check if profile is complete
        const { data: playerData } = await supabase
          .from('players')
          .select('alter_ego_name')
          .eq('user_id', data.user.id)
          .single();

        if (!playerData?.alter_ego_name) {
          router.push('/profile/setup');
        } else {
          router.push('/');
        }
        router.refresh();
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-betrayal-black bg-atmospheric px-4">
      {/* Background atmosphere */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,0,0,0.1)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(201,168,76,0.04)_0%,transparent_50%)]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Skull className="text-betrayal-red" size={56} />
              <div className="absolute inset-0 bg-betrayal-red opacity-20 blur-xl rounded-full" />
            </div>
          </div>
          <h1 className="font-cinzel text-3xl md:text-4xl font-black text-betrayal-gold text-glow-gold uppercase tracking-widest leading-tight">
            Baltimore<br />Betrayal
          </h1>
          <p className="text-betrayal-muted font-cinzel text-xs uppercase tracking-[0.3em] mt-3">
            2nd Annual Edition
          </p>
        </div>

        {/* Auth card */}
        <div className="card border-betrayal-gray p-8">
          <div className="flex border-b border-betrayal-gray mb-8">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 font-cinzel text-xs uppercase tracking-widest transition-colors ${
                mode === 'signin'
                  ? 'text-betrayal-gold border-b-2 border-betrayal-gold -mb-px'
                  : 'text-betrayal-muted hover:text-betrayal-text'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 font-cinzel text-xs uppercase tracking-widest transition-colors ${
                mode === 'signup'
                  ? 'text-betrayal-gold border-b-2 border-betrayal-gold -mb-px'
                  : 'text-betrayal-muted hover:text-betrayal-text'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              {mode === 'signup' && (
                <p className="text-betrayal-muted text-xs mt-1.5">Minimum 6 characters</p>
              )}
            </div>

            {error && (
              <div className="bg-betrayal-red bg-opacity-20 border border-betrayal-red border-opacity-50 rounded p-3">
                <p className="text-betrayal-text text-sm">{error}</p>
              </div>
            )}

            {message && (
              <div className="bg-green-900 bg-opacity-30 border border-green-700 border-opacity-50 rounded p-3">
                <p className="text-green-300 text-sm">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? 'Loading…' : mode === 'signin' ? 'Enter the Manor' : 'Join the Game'}
            </button>
          </form>
        </div>

        <p className="text-center text-betrayal-muted text-xs mt-6 font-cinzel tracking-widest uppercase">
          Trust No One
        </p>
      </div>
    </div>
  );
}

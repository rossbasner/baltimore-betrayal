// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Upload, User } from 'lucide-react';
import Image from 'next/image';

export default function ProfileSetupPage() {
  const [alterEgo, setAlterEgo] = useState('');
  const [realName, setRealName] = useState('');
  const [bio, setBio] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadPlayer() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data: player } = await supabase
        .from('players')
        .select('id, alter_ego_name, real_name, bio, photo_url')
        .eq('user_id', user.id)
        .single();

      if (player) {
        setPlayerId(player.id);
        if (player.alter_ego_name) setAlterEgo(player.alter_ego_name);
        if (player.real_name) setRealName(player.real_name);
        if (player.bio) setBio(player.bio);
        if (player.photo_url) setPhotoPreview(player.photo_url);
      }
    }
    loadPlayer();
  }, [supabase, router]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      let photoUrl: string | undefined;

      // Upload photo if selected
      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const filePath = `${user.id}/avatar.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('player-photos')
          .upload(filePath, photoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('player-photos')
          .getPublicUrl(filePath);

        photoUrl = urlData.publicUrl;
      }

      const profileData: Record<string, unknown> = {
        alter_ego_name: alterEgo.trim(),
        real_name: realName.trim(),
        bio: bio.trim(),
        profile_complete: true,
      };
      if (photoUrl) profileData.photo_url = photoUrl;

      if (playerId) {
        // Normal case: player row already exists, just update it
        const { error: updateError } = await supabase
          .from('players')
          .update(profileData)
          .eq('id', playerId);
        if (updateError) throw updateError;
      } else {
        // Trigger didn't create the rows — create them now
        const { error: userError } = await supabase
          .from('users')
          .upsert({ id: user.id, email: user.email }, { onConflict: 'id' });
        if (userError) throw userError;

        const { error: insertError } = await supabase
          .from('players')
          .insert({ user_id: user.id, ...profileData });
        if (insertError) throw insertError;
      }

      router.push('/players');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-betrayal-black bg-atmospheric flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="font-cinzel text-2xl md:text-3xl font-bold text-betrayal-gold uppercase tracking-widest">
            Create Your Character
          </h1>
          <p className="text-betrayal-muted mt-2 text-sm">
            Choose your alter ego for the weekend
          </p>
        </div>

        <div className="card p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-28 h-28 rounded-full overflow-hidden bg-betrayal-gray border-2 border-betrayal-gray-light">
                {photoPreview ? (
                  <Image src={photoPreview} alt="Preview" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="text-betrayal-muted" size={40} />
                  </div>
                )}
              </div>
              <label className="cursor-pointer">
                <span className="btn-ghost py-2 px-4 text-xs flex items-center gap-2">
                  <Upload size={14} />
                  Upload Photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label>
            </div>

            {/* Alter ego name */}
            <div>
              <label className="label">
                Alter Ego Name <span className="text-betrayal-red">*</span>
              </label>
              <input
                type="text"
                value={alterEgo}
                onChange={(e) => setAlterEgo(e.target.value)}
                className="input-field font-cinzel"
                placeholder="e.g. Lady Crimson, The Phantom…"
                required
                maxLength={50}
              />
            </div>

            {/* Real name */}
            <div>
              <label className="label">
                Real Name <span className="text-betrayal-red">*</span>
              </label>
              <input
                type="text"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                className="input-field"
                placeholder="Your actual name"
                required
                maxLength={50}
              />
            </div>

            {/* Bio */}
            <div>
              <label className="label">
                Character Bio
                <span className="text-betrayal-muted ml-2 normal-case">
                  ({bio.length}/250 chars)
                </span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="input-field resize-none"
                placeholder="A mysterious stranger from the north, known for their silver tongue and sharper daggers…"
                rows={4}
                maxLength={250}
              />
            </div>

            {error && (
              <div className="bg-betrayal-red bg-opacity-20 border border-betrayal-red border-opacity-50 rounded p-3">
                <p className="text-betrayal-text text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !alterEgo.trim() || !realName.trim()}
              className="btn-primary w-full"
            >
              {loading ? 'Saving…' : 'Enter the Game'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  // Verify the caller is actually authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { alter_ego_name, real_name, bio, photo_url } = await request.json();

  // Use service-role client — bypasses RLS entirely
  const admin = createAdminClient();

  // Ensure the public.users row exists (trigger may have missed it)
  const { error: userError } = await admin
    .from('users')
    .upsert({ id: user.id, email: user.email }, { onConflict: 'id' });

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  // Upsert the player profile (works whether or not the row already exists)
  const playerData: Record<string, unknown> = {
    user_id: user.id,
    alter_ego_name,
    real_name,
    bio,
    profile_complete: true,
  };
  if (photo_url) playerData.photo_url = photo_url;

  const { error: playerError } = await admin
    .from('players')
    .upsert(playerData, { onConflict: 'user_id' });

  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

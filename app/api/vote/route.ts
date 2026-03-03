// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { roundtable_id, voted_for_id } = await request.json();
  if (!roundtable_id || !voted_for_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get the current user's player ID
  const { data: player } = await admin
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  if (voted_for_id === player.id) {
    return NextResponse.json({ error: 'Cannot vote for yourself' }, { status: 400 });
  }

  // Confirm roundtable is still open
  const { data: rt } = await admin
    .from('roundtables')
    .select('status')
    .eq('id', roundtable_id)
    .single();

  if (rt?.status !== 'open') {
    return NextResponse.json({ error: 'Voting is closed' }, { status: 400 });
  }

  // Upsert (insert or change vote)
  const { error } = await admin
    .from('votes')
    .upsert(
      { roundtable_id, voter_id: player.id, voted_for_id },
      { onConflict: 'roundtable_id,voter_id' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

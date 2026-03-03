// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/roundtable?id=<roundtableId>
// Returns roundtable status, total vote count, and (if reveal/closed) all votes
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rtId = searchParams.get('id');
  if (!rtId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createAdminClient();

  const { data: rt, error: rtError } = await admin
    .from('roundtables')
    .select('*')
    .eq('id', rtId)
    .single();

  if (rtError) return NextResponse.json({ error: rtError.message }, { status: 500 });

  const { count } = await admin
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('roundtable_id', rtId);

  // Only expose full vote breakdown after reveal
  let votes: { voter_id: string; voted_for_id: string }[] = [];
  if (rt.status === 'reveal' || rt.status === 'closed') {
    const { data } = await admin
      .from('votes')
      .select('voter_id, voted_for_id')
      .eq('roundtable_id', rtId);
    votes = data ?? [];
  }

  return NextResponse.json({ roundtable: rt, count: count ?? 0, votes });
}

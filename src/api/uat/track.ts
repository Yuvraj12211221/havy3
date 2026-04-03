import { supabase } from '../../lib/supabase';

export async function POST(req: Request) {
  const body = await req.json();

  await supabase.from('uat_events').insert({
    client_id: body.client_id,
    event_type: body.event_type,
    tag: body.tag,
    text_content: body.text_content,
    page_url: body.page_url,
    occurred_at: body.occurred_at,
  });

  return new Response('ok');
}

// src/lib/tts/analytics.ts
import { supabase } from '../supabase';

type TriggerType = 'hover' | 'click';

export async function logTtsUsage(params: {
  userId: string;
  triggerType: TriggerType;
  text: string;
}) {
  const { userId, triggerType, text } = params;

  if (!text.trim()) return;

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  // 1️⃣ Insert event-level data
  await supabase.from('tts_events').insert({
    user_id: userId,
    trigger_type: triggerType,
    word_count: words.length,
  });

  // 2️⃣ Update word-level stats
  for (const word of words) {
    await supabase.rpc('increment_tts_word', {
      p_user_id: userId,
      p_word: word,
      p_trigger_type: triggerType,
    });
  }
}

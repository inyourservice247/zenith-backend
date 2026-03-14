import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { seeker_id, original_messages, reframed_question, ai_answer, field_tag } = req.body;

    if (!seeker_id || !original_messages || !reframed_question || !ai_answer || !field_tag) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const { data, error } = await supabase
      .from('questions')
      .insert([{
        seeker_id,
        original_messages,
        reframed_question,
        ai_answer,
        field_tag,
        status: 'forwarded',
        forwarded_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // notify counsellors via supabase email
    await supabase.auth.admin.sendRawEmail({
      to: process.env.COUNSELLOR_NOTIFY_EMAIL,
      subject: 'New question forwarded — Zenith Foundation',
      html: `<p>A new question has been forwarded in the <strong>${field_tag}</strong> category.</p>
             <p><strong>Question:</strong> ${reframed_question}</p>
             <p>Log in to your counsellor portal to answer it.</p>`
    }).catch(() => {}); // silent fail if email not configured yet

    return res.status(200).json({ success: true, question_id: data.id });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

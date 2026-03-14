import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { seeker_id } = req.query;

    if (!seeker_id) return res.status(400).json({ error: 'seeker_id required' });

    // get seeker details
    const { data: seeker, error: seekerError } = await supabase
      .from('seekers')
      .select('id, name, email, career_stage, field, created_at')
      .eq('id', seeker_id)
      .single();

    if (seekerError) throw seekerError;
    if (!seeker) return res.status(404).json({ error: 'Seeker not found' });

    // get all their questions with answers
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(`
        id,
        reframed_question,
        ai_answer,
        field_tag,
        status,
        created_at,
        forwarded_at,
        answers (
          answer_text,
          created_at,
          counsellors (
            name,
            fields
          )
        )
      `)
      .eq('seeker_id', seeker_id)
      .order('created_at', { ascending: false });

    if (questionsError) throw questionsError;

    return res.status(200).json({
      success: true,
      seeker,
      questions: questions || []
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

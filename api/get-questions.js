import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { field, status } = req.query;

    let query = supabase
      .from('questions')
      .select(`
        id,
        reframed_question,
        ai_answer,
        field_tag,
        status,
        forwarded_at,
        created_at,
        seekers (
          name,
          career_stage,
          field
        )
      `)
      .order('created_at', { ascending: false });

    if (field && field !== 'all') query = query.eq('field_tag', field);
    if (status && status !== 'all') query = query.eq('status', status);
    else query = query.in('status', ['forwarded', 'counsellor_answered']);

    const { data, error } = await query;
    if (error) throw error;

    return res.status(200).json({ success: true, questions: data });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

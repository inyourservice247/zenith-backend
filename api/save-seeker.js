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
    const { name, email, phone, career_stage, field } = req.body;

    if (!name || !email || !phone || !career_stage || !field) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const { data, error } = await supabase
      .from('seekers')
      .insert([{ name, email, phone, career_stage, field }])
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, seeker_id: data.id });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

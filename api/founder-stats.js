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
    const now = new Date();
    const minus24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const minus7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const minus30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    // total seekers
    const { count: totalSeekers } = await supabase
      .from('seekers')
      .select('*', { count: 'exact', head: true });

    // total questions
    const { count: totalQuestions } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });

    // ai answered (satisfied — never forwarded)
    const { count: aiAnswered } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ai_answered');

    // forwarded to counsellors
    const { count: forwarded } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['forwarded', 'counsellor_answered']);

    // answered by counsellors
    const { count: counsellorAnswered } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'counsellor_answered');

    // unanswered past 24h
    const { count: unanswered24h } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'forwarded')
      .lt('forwarded_at', minus24h);

    // unanswered past 7 days
    const { count: unanswered7d } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'forwarded')
      .lt('forwarded_at', minus7d);

    // unanswered past 30 days
    const { count: unanswered30d } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'forwarded')
      .lt('forwarded_at', minus30d);

    // questions by field
    const { data: byField } = await supabase
      .from('questions')
      .select('field_tag');

    const fieldCounts = {};
    (byField || []).forEach(q => {
      fieldCounts[q.field_tag] = (fieldCounts[q.field_tag] || 0) + 1;
    });

    // questions by career stage
    const { data: byStage } = await supabase
      .from('seekers')
      .select('career_stage');

    const stageCounts = {};
    (byStage || []).forEach(s => {
      stageCounts[s.career_stage] = (stageCounts[s.career_stage] || 0) + 1;
    });

    // counsellor leaderboard
    const { data: leaderboard } = await supabase
      .from('answers')
      .select(`
        counsellor_id,
        counsellors ( name )
      `);

    const counsellorCounts = {};
    (leaderboard || []).forEach(a => {
      const name = a.counsellors?.name || 'Unknown';
      counsellorCounts[name] = (counsellorCounts[name] || 0) + 1;
    });

    const counsellorLeaderboard = Object.entries(counsellorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 1:1 cta clicks by stage
    const { data: ctaData } = await supabase
      .from('cta_clicks')
      .select('career_stage');

    const ctaCounts = {};
    (ctaData || []).forEach(c => {
      ctaCounts[c.career_stage] = (ctaCounts[c.career_stage] || 0) + 1;
    });

    const totalCtaClicks = ctaData?.length || 0;

    // unanswered questions detail (for Ambreen to redirect)
    const { data: unansweredQuestions } = await supabase
      .from('questions')
      .select(`
        id,
        reframed_question,
        field_tag,
        forwarded_at,
        seekers ( name, career_stage )
      `)
      .eq('status', 'forwarded')
      .order('forwarded_at', { ascending: true });

    return res.status(200).json({
      success: true,
      stats: {
        totalSeekers,
        totalQuestions,
        aiAnswered,
        forwarded,
        counsellorAnswered,
        unanswered: {
          past24h: unanswered24h,
          past7d: unanswered7d,
          past30d: unanswered30d
        },
        byField: fieldCounts,
        byStage: stageCounts,
        counsellorLeaderboard,
        ctaClicks: {
          total: totalCtaClicks,
          byStage: ctaCounts
        },
        unansweredQuestions: unansweredQuestions || []
      }
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

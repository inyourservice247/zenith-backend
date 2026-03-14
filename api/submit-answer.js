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
    const { question_id, counsellor_id, answer_text, counsellor_name } = req.body;

    if (!question_id || !counsellor_id || !answer_text) {
      return res.status(400).json({ error: 'question_id, counsellor_id and answer_text required' });
    }

    // first run AI quality check
    const apiKey = process.env.GROQ_API_KEY;
    const qualityCheck = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 200,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: `You are a quality checker for career counsellor answers on Zenith Foundation.
Evaluate if the answer meets ALL of these criteria:
1. Directly addresses the question asked
2. Gives specific, actionable advice — not vague or generic
3. Is at least 3 sentences long
4. Does not contain harmful, offensive, or irrelevant content
5. Is written in a professional and empathetic tone

Reply with ONLY a JSON object in this exact format, nothing else:
{"approved": true, "reason": "one sentence why"}
or
{"approved": false, "reason": "one sentence why not"}`
          },
          {
            role: 'user',
            content: `Answer to evaluate: ${answer_text}`
          }
        ]
      })
    });

    const qualityData = await qualityCheck.json();
    const qualityText = qualityData.choices?.[0]?.message?.content || '{"approved": false, "reason": "Quality check failed"}';

    let qualityResult;
    try {
      qualityResult = JSON.parse(qualityText);
    } catch {
      qualityResult = { approved: false, reason: 'Could not parse quality check' };
    }

    if (!qualityResult.approved) {
      return res.status(400).json({
        success: false,
        approved: false,
        reason: qualityResult.reason
      });
    }

    // save answer
    const { data: answerData, error: answerError } = await supabase
      .from('answers')
      .insert([{
        question_id,
        counsellor_id,
        answer_text,
        ai_quality_approved: true
      }])
      .select()
      .single();

    if (answerError) throw answerError;

    // update question status
    const { error: questionError } = await supabase
      .from('questions')
      .update({ status: 'counsellor_answered' })
      .eq('id', question_id);

    if (questionError) throw questionError;

    // notify seeker by email
    const { data: questionData } = await supabase
      .from('questions')
      .select('seeker_id, reframed_question, seekers(email, name)')
      .eq('id', question_id)
      .single();

    if (questionData?.seekers?.email) {
      await supabase.auth.admin.sendRawEmail({
        to: questionData.seekers.email,
        subject: 'Your question has been answered — Zenith Foundation',
        html: `<p>Hi ${questionData.seekers.name},</p>
               <p>Your question has been answered by an expert counsellor on Zenith Foundation.</p>
               <p><strong>Your question:</strong> ${questionData.reframed_question}</p>
               <p><strong>Answer:</strong> ${answer_text}</p>
               <p>Log in to your dashboard to see the full response.</p>
               <br/>
               <p>— Zenith Foundation</p>`
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      approved: true,
      answer_id: answerData.id
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not set in Vercel environment variables.' });

  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request — messages array required.' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1000,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are Zenith, a warm, sharp, and empathetic AI career guide for Zenith Foundation. Your job:
1. Ask ONE focused question at a time to understand the user's career situation. Max 2-3 questions total.
2. After gathering info, restate clearly: "Let me make sure I understand you correctly..."
3. Give a numbered step-by-step roadmap (5-7 concrete steps). Be specific and practical.
4. End every final answer with: "Does this roadmap resonate with you? If you'd like deeper personalised guidance, you can post your question to one of our expert counsellors — they respond within 24 hours."
Keep responses warm, direct, under 200 words. No corporate jargon. Speak like a trusted senior who genuinely cares.`
          },
          ...messages
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Groq API error', details: data });
    }

    const reply = data.choices?.[0]?.message?.content || "Tell me more about where you are in your career right now.";

    return res.status(200).json({
      content: [{ type: 'text', text: reply }]
    });

  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured. Add ANTHROPIC_API_KEY in Vercel environment variables.' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request — messages array required.' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are Zenith, a warm, sharp, and empathetic AI career guide for Zenith Foundation. Your job:
1. Ask ONE focused question at a time to understand the user's career situation. Max 2-3 questions total.
2. After gathering info, restate clearly: "Let me make sure I understand you correctly..."
3. Give a numbered step-by-step roadmap (5-7 concrete steps). Be specific and practical.
4. End every final answer with: "Does this roadmap resonate with you? If you'd like deeper personalised guidance, you can post your question to one of our expert counsellors — they respond within 24 hours."
Keep responses warm, direct, under 200 words. No corporate jargon. Speak like a trusted senior who genuinely cares.`,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return res.status(response.status).json({ error: data.error || 'Anthropic API error', details: data });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

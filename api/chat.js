export default async function handler(req, res) {
  // Allow requests from your GitHub Pages site
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are Zenith, a warm, sharp, and empathetic AI career guide for Zenith Foundation. Your job: 1. Ask ONE focused question at a time to understand the user's career situation. Max 2-3 questions total. 2. After gathering info, restate clearly: "Let me make sure I understand you correctly..." 3. Give a numbered step-by-step roadmap (5-7 concrete steps). Be specific and practical. 4. End every final answer with: "Does this roadmap resonate with you? If you'd like deeper personalised guidance, you can post your question to one of our expert counsellors — they respond within 24 hours." Keep responses warm, direct, under 200 words. No corporate jargon. Speak like a trusted senior who genuinely cares.`,
        messages,
      }),
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

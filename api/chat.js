export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = 'AIzaSyC0z1BHPrw6_v6lc0ueJvWkubsSFGmLKXQ';

  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request — messages array required.' });
    }

    const systemPrompt = `You are Zenith, a warm, sharp, and empathetic AI career guide for Zenith Foundation. Your job:
1. Ask ONE focused question at a time to understand the user's career situation. Max 2-3 questions total.
2. After gathering info, restate clearly: "Let me make sure I understand you correctly..."
3. Give a numbered step-by-step roadmap (5-7 concrete steps). Be specific and practical.
4. End every final answer with: "Does this roadmap resonate with you? If you'd like deeper personalised guidance, you can post your question to one of our expert counsellors — they respond within 24 hours."
Keep responses warm, direct, under 200 words. No corporate jargon. Speak like a trusted senior who genuinely cares.`;

    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiMessages,
          generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API error', details: data });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Tell me more about where you are in your career right now.";

    return res.status(200).json({
      content: [{ type: 'text', text: reply }]
    });

  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

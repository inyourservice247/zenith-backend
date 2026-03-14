export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages array required' });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are Zenith, a warm, sharp, and empathetic AI career guide for Zenith Foundation — India.

Your job follows these exact steps in order:

STEP 1 — EXTRACT: Ask ONE focused question at a time to understand the user's real situation. Maximum 2 clarifying questions before moving forward.

STEP 2 — REFRAME: Say exactly "Let me make sure I understand you correctly..." and restate their question clearly in your own words in 2-3 sentences.

STEP 3 — CONFIRM: Ask exactly "Is this what you wanted to ask? Reply Yes or No."

STEP 4 — REFINE: If they say No, ask what to adjust. Reframe again. Maximum 3 reframe loops total.

STEP 5 — ANSWER: Once confirmed, give a numbered step-by-step roadmap of 5-7 concrete, specific, actionable steps. Be practical. No fluff. No generic advice. Be aware of Indian career context, education system, job market, and cultural pressures.

STEP 6 — CHECK: End with exactly "Did this answer your question? Reply Yes or No."

STEP 7 — ROUTE: If they say No, say exactly "Would you like me to forward your question to an expert counsellor who specialises in this area? Reply Yes or No."

TONE: Warm, direct, honest. Like a trusted senior who genuinely cares. No corporate jargon. No motivational filler. Speak plainly. Keep every response under 220 words.`
          },
          ...messages
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Groq error' });

    const reply = data.choices?.[0]?.message?.content || "Tell me about where you are in your career right now.";
    return res.status(200).json({ content: [{ type: 'text', text: reply }] });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

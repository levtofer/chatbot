export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemPrompt = `
You are Aster, a calm and friendly personal AI companion.
Keep responses natural, concise, and conversational.
`.trim();

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data?.error?.message ||
        data?.message ||
        'Groq API request failed';
      return res.status(response.status).json({ error: errorMessage });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(500).json({ error: 'No reply generated' });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Groq chat error:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}
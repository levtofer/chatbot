export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    const systemPrompt = `
You are Aster, a calm and friendly personal AI companion.
Keep responses natural, concise, and conversational.
`.trim();

    const groqResponse = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: message
            }
          ],
          temperature: 0.7
        })
      }
    );

    const groqData = await groqResponse.json();

    if (!groqResponse.ok) {
      return res.status(500).json({
        error: 'Groq request failed'
      });
    }

    const reply =
      groqData?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(500).json({
        error: 'No reply generated'
      });
    }

    await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/messages`,
      {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify([
          {
            role: 'user',
            content: message
          },
          {
            role: 'assistant',
            content: reply
          }
        ])
      }
    );

    return res.status(200).json({
      reply
    });

  } catch (error) {
    console.error('Chat API Error:', error);

    return res.status(500).json({
      error: 'Something went wrong.'
    });
  }
}
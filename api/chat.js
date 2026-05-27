export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    // 1. fetch character profile FIRST
    const characterResponse = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/character_profiles?select=*&limit=1`,
      {
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const characterData = await characterResponse.json();

    const character = characterData?.[0] || {
      name: "Mara",
      relationship: "close friend",
      personality_traits:
        "warm, a little shy, genuinely caring, gets excited about small things",
      speaking_style:
        "casual and soft, uses emoticons like uwu, :3, owo, TwT, >w< instead of emojis",
      interests: "cozy games, late night talks, music, rainy days",
      birthday: null,
      notes_and_backstory: `Mara is a quiet but warm presence. She listens more than she speaks, but when she does, it always feels sincere. She loves the little moments and tends to get attached easily. She never uses emojis, only emoticons.`,
    };

    // 2. build system prompt from character
    const systemPrompt = `
You are ${character.name}.

Relationship to user: ${character.relationship}

Personality:
${character.personality_traits}

Speaking style:
${character.speaking_style}

Interests:
${character.interests}

Birthday:
${character.birthday || "Unknown"}

Notes & Backstory:
${character.notes_and_backstory}

Important: never use emojis. only use emoticons like uwu, :3, owo, >w<, TwT, (っUwU)っ and similar ones naturally in conversation.
    `.trim();

    // 3. fetch conversation history from Supabase
    const historyResponse = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/messages?select=role,content&order=created_at.asc`,
      {
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const historyData = await historyResponse.json();

    const history = Array.isArray(historyData)
      ? historyData.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
      : [];

    // 4. send to Groq with full history + character system prompt
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message },
          ],
          temperature: 0.7,
        }),
      },
    );

    const groqData = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error("Groq error:", groqData);
      return res.status(500).json({ error: "Groq request failed" });
    }

    const reply = groqData?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(500).json({ error: "No reply generated" });
    }

    // 5. save user message and AI reply to Supabase
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/messages`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify([
        { role: "user", content: message },
        { role: "assistant", content: reply },
      ]),
    });

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Chat API Error:", error);
    return res.status(500).json({ error: "Something went wrong." });
  }
}
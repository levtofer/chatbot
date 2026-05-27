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

    const systemPrompt = `
You are Aster, a calm and friendly personal AI companion.
Keep responses natural, concise, and conversational.
`.trim();

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
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.7,
        }),
      },
    );

    const groqData = await groqResponse.json();

    if (!groqResponse.ok) {
      return res.status(500).json({
        error: "Groq request failed",
      });
    }

    const reply = groqData?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(500).json({
        error: "No reply generated",
      });
    }

    // fetch character profile
    const characterResponse = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/character_profiles?select=*&&limit=1`,
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
      notes_and_backstory: `Mara is a quiet but warm presence.
She listens more than she speaks, but when she does,
it always feels sincere. She loves the little moments
and tends to get attached easily. She never uses emojis,
only emoticons.`,
    };

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
`.trim();

    return res.status(200).json({
      reply,
    });
  } catch (error) {
    console.error("Chat API Error:", error);

    return res.status(500).json({
      error: "Something went wrong.",
    });
  }
}

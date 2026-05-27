export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    const supaHeaders = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    };

    // 1. fetch character profile FIRST
    const characterResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/character_profiles?select=*&limit=1`,
      { headers: supaHeaders }
    );

    const characterData = await characterResponse.json();

    const character = characterData?.[0] || {
      id: null,
      name: "Mara",
      relationship: "close friend",
      personality_traits: "warm, a little shy, genuinely caring, gets excited about small things",
      speaking_style: "casual and soft, uses emoticons like uwu, :3, owo, TwT, >w< instead of emojis",
      interests: "cozy games, late night talks, music, rainy days",
      birthday: null,
      notes_and_backstory: `Mara is a quiet but warm presence. She listens more than she speaks, but when she does, it always feels sincere. She loves the little moments and tends to get attached easily. She never uses emojis, only emoticons.`,
    };

    const characterId = character.id;

    // 2. fetch memories for this character
    let memories = [];
    if (characterId) {
      const memoriesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/memories?character_id=eq.${characterId}&order=updated_at.desc`,
        { headers: supaHeaders }
      );
      const memoriesData = await memoriesResponse.json();
      memories = Array.isArray(memoriesData) ? memoriesData : [];
    }

    // 3. build memory block for system prompt
    const memoryBlock = memories.length > 0
      ? `What you know about the user:\n${memories.map(m => `- ${m.key}: ${m.value}`).join("\n")}`
      : "";

    // 4. build system prompt
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

${memoryBlock}

Important: never use emojis. Only use emoticons like uwu, :3, owo, >w<, TwT, (っUwU)っ and similar ones naturally in conversation.
    `.trim();

    // 5. fetch conversation history
    const historyQuery = characterId
      ? `character_id=eq.${characterId}&`
      : "";

    const historyResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?${historyQuery}select=role,content&order=created_at.asc`,
      { headers: supaHeaders }
    );

    const historyData = await historyResponse.json();

    const history = Array.isArray(historyData)
      ? historyData.map((msg) => ({ role: msg.role, content: msg.content }))
      : [];

    // 6. send to Groq
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
      }
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

    // 7. save messages to Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: "POST",
      headers: { ...supaHeaders, Prefer: "return=minimal" },
      body: JSON.stringify([
        { role: "user", content: message, character_id: characterId },
        { role: "assistant", content: reply, character_id: characterId },
      ]),
    });

    // 8. memory extraction — ask Groq if this message contains useful facts
    if (characterId) {
      const extractionPrompt = `
You are a memory extraction assistant.
Analyze the user message below and decide if it contains any long-term useful facts about the user.
Facts worth saving: preferences, habits, important dates, personality traits, people they mention, life details.
NOT worth saving: casual replies, greetings, one-word answers, questions.

If there are facts worth saving, respond ONLY with a JSON array like this:
[{ "key": "favorite_color", "value": "red" }, { "key": "sleep_schedule", "value": "sleeps late" }]

If nothing is worth saving, respond with exactly: []

NOT worth saving: anything about the AI,
AI opinions, AI interests, AI reactions,
fictional details, casual replies, greetings.

Only extract facts about the HUMAN USER from this message.
Ignore anything that sounds like the AI's personality, interests, or opinions.
Only save facts the user stated about themselves.

User message: "${message}"
      `.trim();

      const extractResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: extractionPrompt }],
            temperature: 0.2,
          }),
        }
      );

      const extractData = await extractResponse.json();
      const rawExtract = extractData?.choices?.[0]?.message?.content?.trim();

      try {
        const cleaned = rawExtract.replace(/```json|```/g, "").trim();
        const facts = JSON.parse(cleaned);

        if (Array.isArray(facts) && facts.length > 0) {
          // save each fact to memories via upsert
          await Promise.all(
            facts.map((fact) =>
              fetch(`${SUPABASE_URL}/rest/v1/memories`, {
                method: "POST",
                headers: {
                  ...supaHeaders,
                  Prefer: "resolution=merge-duplicates",
                },
                body: JSON.stringify({
                  character_id: characterId,
                  key: fact.key,
                  value: fact.value,
                  updated_at: new Date().toISOString(),
                }),
              })
            )
          );
        }
      } catch {
        // extraction failed silently, not critical
      }
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Chat API Error:", error);
    return res.status(500).json({ error: "Something went wrong." });
  }
}
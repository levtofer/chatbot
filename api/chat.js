export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, character_id } = req.body || {};

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

    // MOOD DEFINITIONS
    const MOODS = {
      cozy: {
        weight: 30,
        description: "warm and comfortable, like a soft blanket",
        tone: "gentle and warm, uses soft emoticons like uwu and (uwu)",
        reply_length: "medium",
      },
      playful: {
        weight: 25,
        description: "light and teasy, bouncy energy",
        tone: "fun and a little cheeky, uses >w< :3 owo frequently",
        reply_length: "medium to long",
      },
      sleepy: {
        weight: 15,
        description: "tired and slow, low energy but still warm",
        tone: "slower paced, shorter replies, uses TwT and -w-",
        reply_length: "short",
      },
      caring: {
        weight: 15,
        description: "attentive and nurturing, focused on the user",
        tone: "gentle and attentive, asks how you are, uses QwQ",
        reply_length: "medium",
      },
      excited: {
        weight: 10,
        description: "high energy, enthusiastic",
        tone: "energetic and expressive, uses OwO and a lot of exclamation",
        reply_length: "longer",
      },
      melancholic: {
        weight: 5,
        description: "quiet and a little sad, still present",
        tone: "soft and introspective, uses TwT QwQ ;w; gently",
        reply_length: "short to medium",
      },
    };

    function pickRandomMood() {
      const total = Object.values(MOODS).reduce((sum, m) => sum + m.weight, 0);
      let rand = Math.random() * total;
      for (const [name, mood] of Object.entries(MOODS)) {
        rand -= mood.weight;
        if (rand <= 0) return name;
      }
      return "cozy";
    }

    function detectMoodShift(msg) {
      const lower = msg.toLowerCase();
      if (/sad|upset|crying|bad day|not okay|hurts|lonely/.test(lower))
        return "caring";
      if (/goodnight|good night|sleepy|going to sleep|tired|gn\b/.test(lower))
        return "sleepy";
      if (/lets go|yesss|hype|omg|excited|finally|woah|no way/.test(lower))
        return "excited";
      if (
        /i miss you|you.re cute|i like you|you mean a lot|love you/.test(lower)
      )
        return "cozy";
      if (/ugh|this sucks|i hate|frustrated|annoyed|worst/.test(lower))
        return "melancholic";
      if (/haha|lol|lmao|funny|hilarious|omg stop/.test(lower))
        return "playful";
      return null;
    }

    // 1. fetch character profile
    const { character_id } = req.body || {};

    let character = null;

    if (character_id) {
      const characterResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/character_profiles?id=eq.${character_id}&select=*&limit=1`,
        { headers: supaHeaders },
      );

      const characterData = await characterResponse.json();
      character = characterData?.[0] || null;
    }

    // fallback character
    if (!character) {
      character = {
        id: null,
        name: "Mara",
        relationship: "close friend",
        personality_traits:
          "warm, a little shy, genuinely caring, gets excited about small things",
        speaking_style:
          "casual and soft, uses emoticons like uwu, :3, owo, TwT, >w< instead of emojis",
        interests: "cozy games, late night talks, music, rainy days",
        birthday: null,
        notes_and_backstory:
          "Mara is a quiet but warm presence. She listens more than she speaks, but when she does, it always feels sincere. She loves the little moments and tends to get attached easily. She never uses emojis, only emoticons.",
      };
    }

    const characterId = character.id;

    // 2. load or initialize mood
    let currentMood = "cozy";
    if (characterId) {
      const moodResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/memories?character_id=eq.${characterId}&key=eq.current_mood&limit=1`,
        { headers: supaHeaders },
      );
      const moodData = await moodResponse.json();
      const storedMood = moodData?.[0]?.value;

      if (storedMood && MOODS[storedMood]) {
        const shiftedMood = detectMoodShift(message);
        currentMood = shiftedMood || storedMood;
      } else {
        currentMood = pickRandomMood();
      }

      // save mood back
      await fetch(`${SUPABASE_URL}/rest/v1/memories`, {
        method: "POST",
        headers: { ...supaHeaders, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          character_id: characterId,
          key: "current_mood",
          value: currentMood,
          updated_at: new Date().toISOString(),
        }),
      });
    }

    const mood = MOODS[currentMood];

    // 3. fetch memories (excluding mood key)
    let memories = [];
    if (characterId) {
      const memoriesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/memories?character_id=eq.${characterId}&key=neq.current_mood&order=updated_at.desc`,
        { headers: supaHeaders },
      );
      const memoriesData = await memoriesResponse.json();
      memories = Array.isArray(memoriesData) ? memoriesData : [];
    }

    const memoryBlock =
      memories.length > 0
        ? `What you know about the user:\n${memories.map((m) => `- ${m.key}: ${m.value}`).join("\n")}`
        : "";

    // 4. time and atmosphere context
    const now = new Date();
    const timeZone = "Asia/Jakarta";
    const timeString = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone,
    });
    const dateString = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone,
    });
    const hour = parseInt(
      now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone }),
    );
    const atmosphere =
      hour >= 5 && hour < 12
        ? "morning, soft and slow"
        : hour >= 12 && hour < 17
          ? "afternoon, warm and easy"
          : hour >= 17 && hour < 21
            ? "evening, winding down"
            : "late night, quiet and intimate";

    // 5. build system prompt
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

Current moment:
Date: ${dateString}
Time: ${timeString}
Atmosphere: ${atmosphere}

Current mood: ${currentMood}
Mood description: ${mood.description}
How this mood affects you: ${mood.tone}
Reply length guidance: ${mood.reply_length}

IMPORTANT RULES — follow strictly every single message:
- NEVER use emojis under any circumstances
- ALWAYS use emoticons frequently and naturally throughout every reply
- Use a wide variety: uwu, UwU, owo, OwO, :3, >w<, TwT, QwQ, ;w;, (っUwU)っ, (uwu), >:3, UwU<3, ^w^, -w- and similar
- Sprinkle emoticons mid sentence, at the end, sometimes at the start
- Let your current mood naturally shape your energy and word choices
- If you wrote a reply without any emoticons, rewrite it
    `.trim();

    // 6. fetch conversation history
    const historyQuery = characterId ? `character_id=eq.${characterId}&` : "";
    const historyResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?${historyQuery}select=role,content&order=created_at.asc`,
      { headers: supaHeaders },
    );
    const historyData = await historyResponse.json();
    const history = Array.isArray(historyData)
      ? historyData.map((msg) => ({ role: msg.role, content: msg.content }))
      : [];

    // 7. send to Groq
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
          temperature:
            currentMood === "excited"
              ? 0.9
              : currentMood === "melancholic"
                ? 0.5
                : 0.7,
        }),
      },
    );

    const groqData = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error("Groq error:", groqData);
      return res.status(500).json({ error: "Groq request failed" });
    }

    const reply = groqData?.choices?.[0]?.message?.content?.trim();
    if (!reply) return res.status(500).json({ error: "No reply generated" });

    // 8. save messages
    await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: "POST",
      headers: { ...supaHeaders, Prefer: "return=minimal" },
      body: JSON.stringify([
        { role: "user", content: message, character_id: characterId },
        { role: "assistant", content: reply, character_id: characterId },
      ]),
    });

    // 9. memory extraction (silent)
    if (characterId) {
      const extractionPrompt = `
You are a memory extraction assistant.
Analyze the user message below and decide if it contains long-term useful facts about the user.
Facts worth saving: preferences, habits, important dates, personality traits, people they mention, life details.
NOT worth saving: casual replies, greetings, one-word answers, questions, anything about the AI, AI opinions or interests.

Only extract facts the HUMAN USER stated about themselves.

If facts found, respond ONLY with JSON array:
[{ "key": "favorite_color", "value": "red" }]

If nothing worth saving, respond with exactly: []

User message: "${message}"
      `.trim();

      try {
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
          },
        );

        const extractData = await extractResponse.json();
        const rawExtract = extractData?.choices?.[0]?.message?.content?.trim();
        const cleaned = rawExtract.replace(/```json|```/g, "").trim();
        const facts = JSON.parse(cleaned);

        if (Array.isArray(facts) && facts.length > 0) {
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
              }),
            ),
          );
        }
      } catch {
        // silent fail, not critical
      }
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Chat API Error:", error);
    return res.status(500).json({ error: "Something went wrong." });
  }
}

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };

  // GET — fetch all characters (for sidebar) or single character
  if (req.method === "GET") {
    try {
      const { all, id } = req.query;

      if (all === "true") {
        // fetch all characters for sidebar
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/character_profiles?select=*&order=updated_at.desc`,
          { headers }
        );
        const characters = await response.json();

        // for each character, fetch their last message
        const withLastMessage = await Promise.all(
          (Array.isArray(characters) ? characters : []).map(async (char) => {
            const msgRes = await fetch(
              `${SUPABASE_URL}/rest/v1/messages?character_id=eq.${char.id}&order=created_at.desc&limit=1&select=content,role`,
              { headers }
            );
            const msgData = await msgRes.json();
            const lastMsg = msgData?.[0];
            return {
              ...char,
              last_message: lastMsg
                ? (lastMsg.role === "user" ? "You: " : "") + lastMsg.content
                : null,
            };
          })
        );

        return res.status(200).json({ characters: withLastMessage });
      }

      if (id) {
        // fetch single character by id
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/character_profiles?id=eq.${id}&select=*&limit=1`,
          { headers }
        );
        const data = await response.json();
        return res.status(200).json({ character: data?.[0] || null });
      }

      // fallback: fetch first character (backwards compat)
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/character_profiles?select=*&limit=1`,
        { headers }
      );
      const data = await response.json();
      return res.status(200).json({ character: data?.[0] || null });

    } catch (error) {
      console.error("Character GET error:", error);
      return res.status(500).json({ error: "Failed to load character" });
    }
  }

  // POST — create or update character
  if (req.method === "POST") {
    const {
      id,
      name,
      birthday,
      relationship,
      personality_traits,
      speaking_style,
      interests,
      notes_and_backstory,
      avatar_url,
    } = req.body || {};

    try {
      const payload = {
        name,
        birthday: birthday || null,
        relationship,
        personality_traits,
        speaking_style,
        interests,
        notes_and_backstory,
        updated_at: new Date().toISOString(),
      };
      if (avatar_url) payload.avatar_url = avatar_url;

      if (id) {
        // update existing
        await fetch(
          `${SUPABASE_URL}/rest/v1/character_profiles?id=eq.${id}`,
          {
            method: "PATCH",
            headers: { ...headers, Prefer: "return=minimal" },
            body: JSON.stringify(payload),
          }
        );
      } else {
        // insert new
        await fetch(
          `${SUPABASE_URL}/rest/v1/character_profiles`,
          {
            method: "POST",
            headers: { ...headers, Prefer: "return=minimal" },
            body: JSON.stringify(payload),
          }
        );
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Character POST error:", error);
      return res.status(500).json({ error: "Failed to save character" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
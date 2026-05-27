export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };

  // GET — load all memories for a character
  if (req.method === "GET") {
    const { character_id } = req.query;

    if (!character_id) {
      return res.status(400).json({ error: "character_id is required" });
    }

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/memories?character_id=eq.${character_id}&order=updated_at.desc`,
        { headers }
      );

      const data = await response.json();

      return res.status(200).json({ memories: Array.isArray(data) ? data : [] });
    } catch (error) {
      console.error("Memory GET error:", error);
      return res.status(500).json({ error: "Failed to load memories" });
    }
  }

  // POST — upsert a single memory (save or replace)
  if (req.method === "POST") {
    const { character_id, key, value } = req.body || {};

    if (!character_id || !key || !value) {
      return res.status(400).json({ error: "character_id, key, and value are required" });
    }

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/memories`,
        {
          method: "POST",
          headers: {
            ...headers,
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify({
            character_id,
            key,
            value,
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        console.error("Memory POST error:", err);
        return res.status(500).json({ error: "Failed to save memory" });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Memory POST error:", error);
      return res.status(500).json({ error: "Failed to save memory" });
    }
  }

  // DELETE — remove a single memory by id
  if (req.method === "DELETE") {
    const { id } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/memories?id=eq.${id}`,
        { method: "DELETE", headers }
      );

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Memory DELETE error:", error);
      return res.status(500).json({ error: "Failed to delete memory" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
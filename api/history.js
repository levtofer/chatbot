export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { character_id } = req.query;

    if (!character_id) {
      return res.status(400).json({ error: "character_id is required" });
    }

    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/messages?character_id=eq.${character_id}&select=role,content,created_at&order=created_at.asc`,
      {
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    return res.status(200).json({
      messages: Array.isArray(data) ? data : [],
    });

  } catch (error) {
    console.error("History error:", error);
    return res.status(500).json({ error: "Failed to load history" });
  }
}
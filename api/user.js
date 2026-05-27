export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };

  if (req.method === "GET") {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_profiles?select=*&limit=1`,
        { headers }
      );
      const data = await response.json();
      return res.status(200).json({ user: data?.[0] || null });
    } catch (error) {
      console.error("User GET error:", error);
      return res.status(500).json({ error: "Failed to load user profile" });
    }
  }

  if (req.method === "POST") {
    const { display_name, avatar_url, about, timezone } = req.body || {};

    try {
      // check if user profile exists
      const checkResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/user_profiles?select=id&limit=1`,
        { headers }
      );
      const checkData = await checkResponse.json();
      const existingId = checkData?.[0]?.id;

      if (existingId) {
        // update
        await fetch(
          `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${existingId}`,
          {
            method: "PATCH",
            headers: { ...headers, Prefer: "return=minimal" },
            body: JSON.stringify({ display_name, avatar_url, about, timezone, updated_at: new Date().toISOString() }),
          }
        );
      } else {
        // insert
        await fetch(
          `${SUPABASE_URL}/rest/v1/user_profiles`,
          {
            method: "POST",
            headers: { ...headers, Prefer: "return=minimal" },
            body: JSON.stringify({ display_name, avatar_url, about, timezone }),
          }
        );
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("User POST error:", error);
      return res.status(500).json({ error: "Failed to save user profile" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
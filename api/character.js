export default async function handler(req, res) {
  const baseUrl = `${process.env.SUPABASE_URL}/rest/v1/character_profiles`;

  try {
    // GET CHARACTER
    if (req.method === 'GET') {
      const response = await fetch(
        `${baseUrl}?select=*&&limit=1`,
        {
          headers: {
            apikey: process.env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(500).json({
          error: 'Failed to fetch character'
        });
      }

      return res.status(200).json({
        character: data[0] || null
      });
    }

    // SAVE / UPSERT CHARACTER
    if (req.method === 'POST') {
      const character = req.body;

      // fetch existing row
      const existingResponse = await fetch(
        `${baseUrl}?select=id&limit=1`,
        {
          headers: {
            apikey: process.env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const existingData = await existingResponse.json();

      const existingId = existingData?.[0]?.id;

      const payload = existingId
        ? {
            id: existingId,
            ...character,
            updated_at: new Date().toISOString()
          }
        : {
            ...character,
            updated_at: new Date().toISOString()
          };

      const saveResponse = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });

      if (!saveResponse.ok) {
        const error = await saveResponse.text();

        return res.status(500).json({
          error
        });
      }

      return res.status(200).json({
        success: true
      });
    }

    return res.status(405).json({
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Something went wrong'
    });
  }
}
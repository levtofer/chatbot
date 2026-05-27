export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/messages?select=role,content,created_at&order=created_at.asc`,
      {
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const messages = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: 'Failed to fetch messages'
      });
    }

    return res.status(200).json({
      messages
    });

  } catch (error) {
    console.error('History API Error:', error);

    return res.status(500).json({
      error: 'Something went wrong'
    });
  }
}
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    const systemPrompt = `
You are Aster, a calm and friendly personal AI companion.
Keep responses natural, concise, and conversational.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${systemPrompt}\n\nUser: ${message}`,
                },
              ],
            },
          ],
        }),
      },
    );

    const data = await response.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response generated.";

    console.log(JSON.stringify(data, null, 2));

    return res.status(200).json({
      reply,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Something went wrong.",
    });
  }
}

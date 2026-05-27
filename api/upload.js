export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    // read raw body as buffer
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    // parse content-type for boundary
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return res.status(400).json({ error: "Expected multipart/form-data" });
    }

    const boundary = contentType.split("boundary=")[1];
    const parts = buffer.toString("binary").split(`--${boundary}`);

    let fileBuffer = null;
    let fileType = "image/jpeg";
    let characterId = null;
    let characterName = "character";

    for (const part of parts) {
      if (part.includes('name="characterId"')) {
        characterId =
          part.split("\r\n\r\n")[1]?.split("\r\n")[0]?.trim() || null;
      }
      if (part.includes('name="characterName"')) {
        characterName =
          part.split("\r\n\r\n")[1]?.split("\r\n")[0]?.trim() || "character";
      }
      if (part.includes('name="avatar"') && part.includes("Content-Type:")) {
        const ftMatch = part.match(/Content-Type: (.+)\r\n/);
        if (ftMatch) fileType = ftMatch[1].trim();
        const dataStart = part.indexOf("\r\n\r\n") + 4;
        const dataEnd = part.lastIndexOf("\r\n");
        fileBuffer = Buffer.from(part.slice(dataStart, dataEnd), "binary");
      }
    }

    if (!fileBuffer) {
      return res.status(400).json({ error: "No file found in request" });
    }

    const fileName = `${characterId || "unknown"}-avatar`;

    // upload to Supabase Storage
    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/avatars/${fileName}`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": fileType,
          "x-upsert": "true",
        },
        body: fileBuffer,
      },
    );

    if (!uploadResponse.ok) {
      const err = await uploadResponse.json();
      console.error("Upload error:", err);
      return res.status(500).json({ error: "Upload failed" });
    }

    // build public URL
    const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}`;

    if (characterId) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/character_profiles?id=eq.${characterId}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ avatar_url: avatarUrl }),
        },
      );
    }

    return res.status(200).json({ avatarUrl });
  } catch (error) {
    console.error("Upload API error:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

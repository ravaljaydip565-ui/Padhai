export default async function handler(req, res) {
  // ---------- CORS ----------
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // ---------- API KEY ----------
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API Key Missing" });
    }

    const { mode = "text", contents, prompt } = req.body || {};

    // ---------- IMAGE MODE ----------
    if (mode === "image") {
      const imageRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: { sampleCount: 1 }
          })
        }
      );

      const imageData = await imageRes.json();

      return res.status(200).json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text:
                    imageData?.predictions?.[0]?.bytesBase64Encoded
                      ? "IMAGE_GENERATED"
                      : "Image generation failed"
                }
              ]
            }
          }
        ],
        image: imageData?.predictions?.[0]?.bytesBase64Encoded || null
      });
    }

    // ---------- TEXT / VOICE MODE ----------
    const models = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"];
    let finalText = null;

    for (const model of models) {
      try {
        const aiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              generationConfig: { temperature: 0.7 }
            })
          }
        );

        const data = await aiRes.json();

        finalText =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ||
          data?.text ||
          null;

        if (finalText) break;
      } catch (_) {}
    }

    // ---------- FINAL SAFE RESPONSE ----------
    return res.status(200).json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: finalText || "AI response unavailable"
              }
            ]
          }
        }
      ]
    });
  } catch (err) {
    return res.status(500).json({
      candidates: [
        {
          content: {
            parts: [{ text: "Backend error occurred" }]
          }
        }
      ]
    });
  }
        }

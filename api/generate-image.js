import OpenAI from "openai";

export default async function handler(req, res) {
  const ALLOWED_ORIGIN =
    process.env.ALLOWED_ORIGIN || "http://ec2-3-109-3-181.ap-south-1.compute.amazonaws.com";

  // CORS
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { prompt, n = 2, size = "1024x1024" } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const resp = await openai.images.generate({
      model: "gpt-image-1",
      prompt: String(prompt).slice(0, 2000),
      n: Math.max(1, Math.min(4, Number(n) || 1)),
      size: ["1024x1024", "1792x1024", "1024x1792"].includes(size) ? size : "1024x1024",
    });

    const images = (resp.data || []).map(i => i.url).filter(Boolean);
    if (!images.length) return res.status(502).json({ error: "No images returned" });

    return res.status(200).json({ images });
  } catch (err) {
    console.error("Vercel fn error:", err?.response?.data || err?.message || err);
    return res.status(500).json({
      error: "Failed to generate images",
      details: err?.response?.data?.error?.message,
    });
  }
}

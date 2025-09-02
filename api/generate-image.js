import OpenAI from "openai";

export default async function handler(req, res) {
  // --- CORS (adjust origin or use * for testing) ---
  const ALLOWED_ORIGIN =
    process.env.ALLOWED_ORIGIN || "http://ec2-3-109-3-181.ap-south-1.compute.amazonaws.com";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method Not Allowed" });

  // --- Fast checks that often cause 500s ---
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not set on the server" });
  }

  // Vercel sometimes gives strings for body in Node functions; normalize:
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { prompt, n = 2, size = "1024x1024" } = body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Prompt is required" });
  }

  // sanitize inputs
  const safePrompt = String(prompt).slice(0, 2000).trim();
  const safeN = Math.max(1, Math.min(4, Number(n) || 1));
  const safeSize = ["1024x1024", "1792x1024", "1024x1792"].includes(size)
    ? size
    : "1024x1024";

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const r = await openai.images.generate({
      model: "gpt-image-1",
      prompt: safePrompt,
      n: safeN,
      size: safeSize
    });

    const images = (r.data || []).map(i => i.url).filter(Boolean);
    if (!images.length) {
      return res.status(502).json({ error: "No images returned from OpenAI" });
    }
    return res.status(200).json({ images });
  } catch (err) {
    // Bubble up meaningful details so you can see what failed.
    const status = err?.status || err?.response?.status || 500;
    const provider =
      err?.response?.data?.error?.message ||
      err?.error?.message ||
      err?.message ||
      "Unknown error";

    console.error("OpenAI error:", {
      status,
      code: err?.code,
      message: err?.message,
      provider: err?.response?.data || err // full payload in logs
    });

    return res.status(status).json({
      error: "Failed to generate images",
      details: provider
    });
  }
}

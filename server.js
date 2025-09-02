// server.js
require('dotenv').config();          // uses .env
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');    // CommonJS import

const app = express();
const port = process.env.PORT || 3000;

// CORS: allow your site(s). Use "*" if you aren't using cookies/credentials.
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "*",
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

app.use(bodyParser.json({ limit: '1mb' }));

// Init OpenAI client from env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// POST /generate-image
app.post('/generate-image', async (req, res) => {
  try {
    console.log(req.body);
    const prompt = String(req.body?.prompt || '').trim();
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const n = Math.max(1, Math.min(4, Number(req.body?.n ?? 2)));
    const size = ['1024x1024', '1792x1024', '1024x1792'].includes(req.body?.size)
      ? req.body.size
      : '1024x1024';

    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      n,
      size
    });

    const imageUrls = (response.data || [])
      .map(it => it.url)
      .filter(Boolean);

    if (!imageUrls.length) {
      return res.status(502).json({ error: 'No images returned from OpenAI' });
    }

    res.set({
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || "*",
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store'
    });

    res.json({ images: imageUrls });
  } catch (err) {
    console.error('Image error:', err.response?.data || err.message || err);
    res.status(500).json({
      error: 'Failed to generate images',
      details: err.response?.data?.error?.message ?? undefined
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// NOVA OS — Backend API Proxy Server
// Proxies AI requests to the Anthropic API so the key stays server-side.

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Serve static files from project root
app.use(express.static(join(__dirname, '..')));
app.use(express.json());

// API key — set via environment variable: ANTHROPIC_API_KEY
// Run with: ANTHROPIC_API_KEY=sk-ant-... npm start
const API_KEY = process.env.ANTHROPIC_API_KEY || '';

// AI proxy endpoint
app.post('/api/ai', async (req, res) => {
  try {
    const { system, messages, model, max_tokens } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-haiku-4-5-20251001',
        max_tokens: max_tokens || 1024,
        system: system || 'You are NOVA, a helpful AI assistant built into NOVA OS.',
        messages: messages || [],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', response.status, err);
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`NOVA OS server running at http://localhost:${PORT}`);
});

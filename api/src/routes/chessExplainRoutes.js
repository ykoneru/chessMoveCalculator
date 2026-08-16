const express = require('express');
const { verifyToken } = require('../middleware/chessJwtAuth');

const router = express.Router();

router.post('/explain-move', verifyToken, async (req, res) => {
  const fen = req.body.fen;
  const move = req.body.move;

  if (!fen || !move) {
    return res.status(400).json({ error: 'fen and move are required' });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    `Chess position (FEN): ${fen}\n` +
                    `Stockfish suggests the move: ${move}\n` +
                    `In 2-3 sentences, explain why this move is strong.`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiRes.ok) {
      const errorBody = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errorBody);
      return res.status(502).json({ error: 'Explanation service unavailable' });
    }

    const data = await geminiRes.json();

    let text = 'No explanation returned.';
    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text
    ) {
      text = data.candidates[0].content.parts[0].text;
    }

    res.status(200).json({ explanation: text });
  } catch (err) {
    console.error('Explain-move failed:', err.message);
    res.status(500).json({ error: 'Failed to get explanation' });
  }
});

module.exports = router;

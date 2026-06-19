const express = require('express');
const { generateClonedSpeech } = require('../minimax');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing "text" string in request body.' });
    }

    // MiniMax has a practical text length limit per call; trim defensively
    // so very long replies don't fail the request outright.
    const safeText = text.slice(0, 2000);

    const audioBase64 = await generateClonedSpeech(safeText);

    res.json({ audio: audioBase64, format: 'mp3' });
  } catch (err) {
    console.error('TTS route error:', err);
    res.status(500).json({ error: 'Failed to generate speech.' });
  }
});

module.exports = router;

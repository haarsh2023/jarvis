const fetch = require('node-fetch');

const MINIMAX_TTS_URL = 'https://api.minimax.io/v1/t2a_v2';

/**
 * Calls MiniMax's text-to-speech endpoint using your cloned voice_id.
 * Returns base64-encoded audio (mp3) that the frontend can play directly.
 */
async function generateClonedSpeech(text) {
  const apiKey = process.env.MINIMAX_API_KEY;
  const voiceId = process.env.MINIMAX_VOICE_ID;

  if (!apiKey) throw new Error('MINIMAX_API_KEY is not set on the server.');
  if (!voiceId) throw new Error('MINIMAX_VOICE_ID is not set on the server.');

  const response = await fetch(MINIMAX_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'speech-2.6-hd',
      text,
      voice_id: voiceId,
      speed: 1.0,
      vol: 1.0,
      pitch: 0,
      audio_sample_rate: 32000,
      bitrate: 128000,
      format: 'mp3',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`MiniMax TTS error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  if (data.base_resp && data.base_resp.status_code !== 0) {
    throw new Error(`MiniMax TTS failed: ${data.base_resp.status_msg}`);
  }

  // data.audio_file is base64-encoded mp3 audio
  return data.audio_file;
}

module.exports = { generateClonedSpeech };

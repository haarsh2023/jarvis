const fetch = require('node-fetch');

// Two possible base URLs — minimax.io works globally outside mainland China
const MINIMAX_TTS_URL = 'https://api.minimax.io/v1/t2a_v2';

/**
 * Calls MiniMax's t2a_v2 endpoint using your cloned voice.
 * Requires MINIMAX_API_KEY, MINIMAX_GROUP_ID, and MINIMAX_VOICE_ID in env vars.
 * Returns base64-encoded mp3 audio string.
 */
async function generateClonedSpeech(text) {
  const apiKey  = process.env.MINIMAX_API_KEY;
  const groupId = process.env.MINIMAX_GROUP_ID;
  const voiceId = process.env.MINIMAX_VOICE_ID;

  if (!apiKey)  throw new Error('MINIMAX_API_KEY is not set on the server.');
  if (!groupId) throw new Error('MINIMAX_GROUP_ID is not set on the server.');
  if (!voiceId) throw new Error('MINIMAX_VOICE_ID is not set on the server.');

  // GroupId must be passed as a query parameter
  const url = `${MINIMAX_TTS_URL}?GroupId=${groupId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'speech-02-hd',          // stable, widely supported model
      text,
      stream: false,
      voice_setting: {
        voice_id: voiceId,             // your cloned voice id goes here
        speed: 1.0,
        vol: 1.0,
        pitch: 0,
        emotion: 'neutral',
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`MiniMax TTS HTTP error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  // Check MiniMax's own status field inside the response body
  if (data.base_resp && data.base_resp.status_code !== 0) {
    throw new Error(`MiniMax TTS failed: ${data.base_resp.status_msg}`);
  }

  // Audio is at data.data.audio (base64 hex — MiniMax returns hex, not base64)
  const audioHex = data.data?.audio;
  if (!audioHex) {
    throw new Error('MiniMax TTS returned no audio data.');
  }

  // Convert hex string → base64 so the frontend can use it in a data: URL
  const audioBase64 = Buffer.from(audioHex, 'hex').toString('base64');
  return audioBase64;
}

module.exports = { generateClonedSpeech };

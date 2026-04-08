require('dotenv').config({path: './agentup/.env'});
const key = process.env.CARTESIA_API_KEY.trim();
console.log('Using key:', key);
fetch('https://api.cartesia.ai/tts/bytes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': key,
    'Cartesia-Version': '2024-06-10'
  },
  body: JSON.stringify({
    model_id: 'sonic-2',
    transcript: 'Hello world',
    voice: { mode: 'id', id: 'a0e99841-438c-4a64-b679-ae501e7d6091' },
    output_format: { container: 'mp3', bit_rate: 128000, sample_rate: 44100 }
  })
}).then(res => {
  console.log('Status:', res.status);
  return res.text();
}).then(text => console.log('Response:', text.substring(0, 100)))
.catch(console.error);

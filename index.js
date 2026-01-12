const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());  // 추가: JSON 파싱

// 환경변수로 직접 설정 (Vercel Dashboard에서 넣기)
const KEY_ID = process.env.APPLE_MUSIC_KEY_ID;
const TEAM_ID = process.env.APPLE_MUSIC_TEAM_ID;
const PRIVATE_KEY = process.env.APPLE_MUSIC_PRIVATE_KEY;  // .p8 전체 내용 (-----BEGIN PRIVATE KEY----- ~ -----END PRIVATE KEY-----)

if (!KEY_ID || !TEAM_ID || !PRIVATE_KEY) {
  throw new Error('Missing required environment variables');
}

function generateDeveloperToken() {
  const now = Math.floor(Date.now() / 1000);
  const sixMonths = 60 * 60 * 24 * 180;  // 6개월 (Apple 최대)

  const payload = {
    iss: TEAM_ID,
    iat: now,
    exp: now + sixMonths,
  };

  const header = {
    alg: 'ES256',
    kid: KEY_ID,
  };

  return jwt.sign(payload, PRIVATE_KEY, {
    algorithm: 'ES256',
    header,
  });
}

app.get('/apple-music-token', (req, res) => {
  try {
    const token = generateDeveloperToken();
    res.json({ token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed_to_generate_token' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Apple Music token server listening on port ${PORT}`);
});

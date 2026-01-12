import jwt from 'jsonwebtoken';

export async function generateToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: process.env.APPLE_MUSIC_TEAM_ID,
    iat: now,
    exp: now + (60 * 60 * 24 * 180), // 6개월
  };

  const header = {
    alg: 'ES256',
    kid: process.env.APPLE_MUSIC_KEY_ID,
  };

  return jwt.sign(payload, process.env.APPLE_MUSIC_PRIVATE_KEY, {
    algorithm: 'ES256',
    header,
  });
}

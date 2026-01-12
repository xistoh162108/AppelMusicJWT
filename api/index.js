import { readFileSync, existsSync } from 'fs';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const cacheFile = './top100-cache.json';
  if (existsSync(cacheFile)) {
    const data = JSON.parse(readFileSync(cacheFile, 'utf8'));
    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data
    });
  }

  res.status(404).json({ error: 'Run /api/cron first!' });
}

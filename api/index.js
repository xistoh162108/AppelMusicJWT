import { readFileSync, existsSync } from 'fs';
import { readCache } from '../lib/redis.js';

const CACHE_FILE = './top100-cache.json';
const REDIS_KEY = 'top100-cache';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  let payload = null;

  if (existsSync(CACHE_FILE)) {
    try {
      const fileData = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
      payload = Array.isArray(fileData) ? { data: fileData } : fileData;
    } catch (err) {
      console.error('Failed to read cache file:', err.message);
    }
  }

  if (!payload || !Array.isArray(payload.data)) {
    payload = await readCache(REDIS_KEY);
  }

  if (payload && Array.isArray(payload.data)) {
    return res.json({
      success: true,
      timestamp: payload.timestamp || new Date().toISOString(),
      data: payload.data,
    });
  }

  res.status(404).json({ error: 'No cache found. Run /api/cron first!' });
}

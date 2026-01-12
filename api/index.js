import { readFileSync, existsSync } from 'fs';
import { readCache } from '../lib/redis.js';
import { getMemoryCache, setMemoryCache } from '../lib/memory-cache.js';
import { runCron } from './cron.js';

const CACHE_FILE = './top100-cache.json';
const REDIS_KEY = 'top100-cache';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  let payload = null;

  payload = getMemoryCache();

  if (!payload && existsSync(CACHE_FILE)) {
    try {
      const fileData = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
      payload = Array.isArray(fileData) ? { data: fileData } : fileData;
      setMemoryCache(payload);
    } catch (err) {
      console.error('Failed to read cache file:', err.message);
    }
  }

  if (!payload || !Array.isArray(payload.data)) {
    payload = await readCache(REDIS_KEY);
    if (payload) setMemoryCache(payload);
  }

  if (!payload || !Array.isArray(payload.data)) {
    try {
      payload = await runCron();
    } catch (err) {
      console.error('On-demand cron run failed:', err.message);
    }
  }

  if (payload && Array.isArray(payload.data)) {
    return res.json({
      success: true,
      timestamp: payload.timestamp || new Date().toISOString(),
      data: payload.data,
    });
  }

  res.status(503).json({ error: 'Cache unavailable. Please retry in a moment.' });
}

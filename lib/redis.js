import fetch from 'node-fetch';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasRedisConfig = Boolean(redisUrl && redisToken);

async function sendRedisCommand(command) {
  if (!hasRedisConfig) return null;

  const res = await fetch(redisUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redisToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ command }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash request failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function writeCache(key, value) {
  if (!hasRedisConfig) return false;
  try {
    const result = await sendRedisCommand(['SET', key, JSON.stringify(value)]);
    return Boolean(result?.result === 'OK');
  } catch (err) {
    console.error('Failed to write Redis cache:', err.message);
    return false;
  }
}

export async function readCache(key) {
  if (!hasRedisConfig) return null;
  try {
    const result = await sendRedisCommand(['GET', key]);
    if (!result?.result) return null;
    return JSON.parse(result.result);
  } catch (err) {
    console.error('Failed to read Redis cache:', err.message);
    return null;
  }
}

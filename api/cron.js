import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { generateToken } from '../lib/apple.js';
import { fetchLyricsByISRC } from '../lib/musixmatch.js';
import { writeCache } from '../lib/redis.js';

const DEFAULT_TOP100_PLAYLIST_ID = 'pl.d3d10c32fbc540b38e266367dc8cb00c';

async function runCron() {
  console.log('Starting KR Top100 cron job');

  const token = await generateToken();
  console.log('Apple token issued');

  const topChartPlaylistId =
    process.env.APPLE_MUSIC_TOP100_PLAYLIST_ID || DEFAULT_TOP100_PLAYLIST_ID;

  const res = await fetch(
    `https://api.music.apple.com/v1/catalog/kr/playlists/${topChartPlaylistId}?include=tracks`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const playlistPayload = await res.json();

  if (playlistPayload?.errors?.length) {
    console.log('Apple Music response payload:', JSON.stringify(playlistPayload, null, 2));
    throw new Error('Apple Music playlist API returned an error');
  }

  const playlist = playlistPayload?.data?.[0];
  const trackEntries = playlist?.relationships?.tracks?.data ?? [];

  if (!Array.isArray(trackEntries) || trackEntries.length === 0) {
    console.log('Apple Music response payload:', JSON.stringify(playlistPayload, null, 2));
    throw new Error('Apple Music playlist response did not include songs');
  }

  console.log(`Fetched ${trackEntries.length} songs from playlist ${topChartPlaylistId}`);

  const songs = [];
  for (const entry of trackEntries) {
    const attrs = entry.attributes;
    console.log(`Processing ${attrs.name} - ${attrs.artistName}`);

    const releaseYear = attrs.releaseDate
      ? Number.parseInt(attrs.releaseDate.slice(0, 4), 10)
      : null;

    let lyricsFull = null;
    let lyricsSnippet = null;
    if (attrs.isrc) {
      try {
        const lyrics = await fetchLyricsByISRC(attrs.isrc);
        lyricsFull = lyrics?.full ?? null;
        lyricsSnippet = lyrics?.snippet ?? null;
      } catch (e) {
        console.log(`Lyrics lookup failed for ${attrs.isrc}`);
      }
    }

    songs.push({
      id: attrs.isrc || entry.id,
      title: attrs.name,
      artist: attrs.artistName,
      album: attrs.albumName ?? null,
      year: Number.isFinite(releaseYear) ? releaseYear : null,
      coverUrl: attrs.artwork?.url?.replace('{w}', '300')?.replace('{h}', '300') ?? null,
      coverLocalPath: null,
      lyricsFull,
      lyricsSnippet,
      appleMusicUrl: attrs.url || playlist?.attributes?.url || `https://music.apple.com/kr/song/${entry.id}`,
      previewUrl: attrs.previews?.[0]?.url ?? null,
    });
  }

  const payload = {
    timestamp: new Date().toISOString(),
    data: songs,
  };

  try {
    writeFileSync('./top100-cache.json', JSON.stringify(payload, null, 2));
    console.log(`Cached ${songs.length} songs to ./top100-cache.json`);
  } catch (err) {
    if (err.code === 'EROFS') {
      console.log('Skipping file cache: filesystem is read-only');
    } else {
      throw err;
    }
  }

  const redisResult = await writeCache('top100-cache', payload);
  if (redisResult) {
    console.log('Cached payload to Redis');
  } else {
    console.log('Redis cache skipped (missing configuration?)');
  }

  console.log('Done');

  const result = {
    success: true,
    count: songs.length,
    sample: payload.data[0],
    timestamp: payload.timestamp,
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res?.status(405)?.end();
    return;
  }

  try {
    const result = await runCron();
    res?.status(200)?.json(result);
  } catch (err) {
    console.error('Cron handler failed:', err);
    res?.status(500)?.json({ error: err.message });
    throw err;
  }
}

const isCliRun = (() => {
  try {
    const entry = process.argv[1];
    if (!entry) return false;
    return fileURLToPath(import.meta.url) === entry;
  } catch {
    return false;
  }
})();

if (isCliRun) {
  runCron().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

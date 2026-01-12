import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
import { generateToken } from '../lib/apple.js';
import { fetchLyricsByISRC } from '../lib/musixmatch.js';

const DEFAULT_TOP100_PLAYLIST_ID = 'pl.d3d10c32fbc540b38e266367dc8cb00c';

async function main() {
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

  writeFileSync('./top100-cache.json', JSON.stringify(songs, null, 2));
  console.log(`Cached ${songs.length} songs to ./top100-cache.json`);
  console.log('Done');

  console.log(JSON.stringify({
    success: true,
    count: songs.length,
    sample: songs[0]
  }, null, 2));
}

main().catch(console.error);

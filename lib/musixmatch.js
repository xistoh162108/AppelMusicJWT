let missingKeyWarned = false;

export async function fetchLyricsByISRC(isrc) {
  try {
    const mmKey = process.env.MUSIXMATCH_KEY;
    if (!mmKey) {
      if (!missingKeyWarned) {
        console.warn('MUSIXMATCH_KEY is not set; skipping lyrics lookups.');
        missingKeyWarned = true;
      }
      return null;
    }

    const matcherRes = await fetch(
      `https://api.musixmatch.com/ws/1.1/matcher.lyrics.get?track_isrc=${isrc}&apikey=${mmKey}`
    );
    const matcher = await matcherRes.json();

    if (
      matcher.message.header.status_code === 200 &&
      matcher.message.body?.lyrics?.lyrics_body
    ) {
      const body = matcher.message.body.lyrics.lyrics_body;
      return {
        full: body,
        snippet: body ? `${body.slice(0, 500)}...` : null
      };
    }

    // matcher에서 못 찾으면 track.search + track.lyrics.get으로 재시도
    const searchRes = await fetch(
      `https://api.musixmatch.com/ws/1.1/track.search?track_isrc=${isrc}&apikey=${mmKey}`
    );
    const search = await searchRes.json();

    if (search.message.header.status_code !== 200 || !search.message.body.track_list?.[0]) {
      console.warn(`Musixmatch track not found for ISRC ${isrc}`, search.message.header);
      return null;
    }

    const trackId = search.message.body.track_list[0].track.track_id;

    const lyricsRes = await fetch(
      `https://api.musixmatch.com/ws/1.1/track.lyrics.get?track_id=${trackId}&apikey=${mmKey}`
    );
    const lyrics = await lyricsRes.json();

    if (lyrics.message.header.status_code === 200) {
      const body = lyrics.message.body.lyrics?.lyrics_body || null;
      return {
        full: body,
        snippet: body ? `${body.slice(0, 500)}...` : null
      };
    }
  } catch (e) {
    console.error('Musixmatch error:', e.message);
  }
  return null;
}

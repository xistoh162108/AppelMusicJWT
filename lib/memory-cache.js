let cache = null;

export function setMemoryCache(payload) {
  cache = payload;
}

export function getMemoryCache() {
  return cache;
}

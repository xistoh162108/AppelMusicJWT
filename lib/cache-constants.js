import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const currentDir = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = join(currentDir, '..');
export const CACHE_FILE = join(PROJECT_ROOT, 'top100-cache.json');
export const REDIS_KEY = 'top100-cache';

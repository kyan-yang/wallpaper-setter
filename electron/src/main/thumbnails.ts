import { execFile } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Thumbnails come from sips (ImageIO): it reads every format macOS can use as
// a wallpaper, including HEIC, and keeps the EXIF orientation tag so Chromium
// draws rotated phone photos upright. Each (file, mtime, size) converts once
// and is cached on disk.

const CACHE_DIR = path.join(os.homedir(), 'Library', 'Caches', 'WallpaperSetter', 'thumbnails');
const SIZES = [256, 512, 1024, 2048, 4096];
// sips is CPU-heavy; run at most one conversion per core.
const MAX_CONVERSIONS = os.availableParallelism();

let running = 0;
const waiting: Array<() => void> = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONVERSIONS) await new Promise<void>((resolve) => waiting.push(resolve));
  running += 1;
  try {
    return await task();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

function sips(source: string, size: number, target: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      '/usr/bin/sips',
      ['-Z', String(size), '-s', 'format', 'jpeg', '-s', 'formatOptions', '85', source, '--out', target],
      { timeout: 30000 },
      (error, _stdout, stderr) => {
        if (error) reject(new Error(`sips could not read ${source}: ${stderr.trim() || error.message}`));
        else resolve();
      },
    );
  });
}

export function bucketFor(requested: number): number {
  return SIZES.find((size) => size >= requested) ?? SIZES[SIZES.length - 1];
}

// Returns the path of a JPEG no larger than the smallest bucket that covers `requested` pixels.
export async function thumbnail(source: string, requested: number): Promise<string> {
  const size = bucketFor(requested);
  const { mtimeMs } = await fs.promises.stat(source);
  const key = crypto.createHash('sha1').update(`${source}\0${mtimeMs}\0${size}`).digest('hex');
  const target = path.join(CACHE_DIR, `${key}.jpg`);
  if (fs.existsSync(target)) return target;

  await fs.promises.mkdir(CACHE_DIR, { recursive: true });
  const partial = `${target}.${process.pid}.${crypto.randomUUID()}.jpg`;
  await withSlot(() => sips(source, size, partial));
  await fs.promises.rename(partial, target);
  return target;
}

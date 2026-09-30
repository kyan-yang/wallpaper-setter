const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { countImages, listFolder } = require('../dist/main/files.js');

// A real photo from the user's Pictures folder, so listing sees a real JPEG.
const REAL_PHOTO = fs.readdirSync(path.join(os.homedir(), 'Pictures'))
  .filter((name) => /\.jpe?g$/i.test(name))
  .map((name) => path.join(os.homedir(), 'Pictures', name))[0];

function makeFolder() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallpaper-files-'));
  fs.copyFileSync(REAL_PHOTO, path.join(dir, 'older.jpg'));
  fs.copyFileSync(REAL_PHOTO, path.join(dir, 'Newer.HEIC'));
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'not an image');
  fs.writeFileSync(path.join(dir, '.hidden.png'), '');
  fs.mkdirSync(path.join(dir, 'Trips 10'));
  fs.mkdirSync(path.join(dir, 'Trips 9'));
  fs.mkdirSync(path.join(dir, '.git'));
  fs.mkdirSync(path.join(dir, 'Photos Library.photoslibrary'));
  fs.symlinkSync(path.join(dir, 'Trips 9'), path.join(dir, 'Linked trips'));
  fs.utimesSync(path.join(dir, 'older.jpg'), new Date('2024-01-01'), new Date('2024-01-01'));
  fs.utimesSync(path.join(dir, 'Newer.HEIC'), new Date('2025-01-01'), new Date('2025-01-01'));
  return dir;
}

test('listFolder returns visible folders by name and images newest first', async () => {
  const dir = makeFolder();
  try {
    const listing = await listFolder(dir);
    assert.deepEqual(listing.folders.map((f) => f.name), ['Linked trips', 'Trips 9', 'Trips 10']);
    assert.deepEqual(listing.images.map((i) => i.name), ['Newer.HEIC', 'older.jpg']);
    assert.equal(listing.images[1].path, path.join(dir, 'older.jpg'));
    assert.ok(listing.images[0].mtimeMs > listing.images[1].mtimeMs);
    assert.equal(await countImages(dir), 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('listFolder explains unreadable and missing folders', async () => {
  const dir = makeFolder();
  const locked = path.join(dir, 'Trips 10');
  fs.chmodSync(locked, 0o000);
  try {
    await assert.rejects(listFolder(locked), /macOS blocked access to .*Trips 10/);
    await assert.rejects(listFolder(path.join(dir, 'gone')), /no longer exists/);
    await assert.rejects(listFolder(path.join(dir, 'older.jpg')), /is not a folder/);
  } finally {
    fs.chmodSync(locked, 0o755);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

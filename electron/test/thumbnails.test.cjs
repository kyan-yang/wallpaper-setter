const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { bucketFor, thumbnail } = require('../dist/main/thumbnails.js');

const REAL_PHOTO = fs.readdirSync(path.join(os.homedir(), 'Pictures'))
  .filter((name) => /\.jpe?g$/i.test(name))
  .map((name) => path.join(os.homedir(), 'Pictures', name))[0];

function dimensions(file) {
  const out = execFileSync('/usr/bin/sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
  return [...out.matchAll(/pixel(?:Width|Height): (\d+)/g)].map((m) => Number(m[1]));
}

test('thumbnail converts HEIC to a cached JPEG in the covering size bucket', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallpaper-thumbs-'));
  const heic = path.join(dir, 'photo.heic');
  execFileSync('/usr/bin/sips', ['-s', 'format', 'heic', REAL_PHOTO, '--out', heic]);
  try {
    assert.equal(bucketFor(300), 512);
    assert.equal(bucketFor(9000), 4096);

    const first = await thumbnail(heic, 300);
    assert.match(fs.readFileSync(first).subarray(0, 3).toString('hex'), /^ffd8ff/);
    assert.equal(Math.max(...dimensions(first)), 512);
    assert.equal(await thumbnail(heic, 400), first);

    fs.utimesSync(heic, new Date(), new Date(Date.now() + 5000));
    assert.notEqual(await thumbnail(heic, 300), first);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('thumbnail fails loudly on a file sips cannot read', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallpaper-thumbs-'));
  const broken = path.join(dir, 'broken.jpg');
  fs.writeFileSync(broken, 'not really a jpeg');
  try {
    await assert.rejects(thumbnail(broken, 256), /sips could not read .*broken\.jpg/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

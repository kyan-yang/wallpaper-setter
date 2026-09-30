const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { WALLPAPER_STORE_PATH, assertApplicable, writeWallpaperStore } = require('../dist/main/wallpaper.js');

// Runs against a copy of this Mac's real WallpaperAgent store, so the test
// exercises the layout macOS actually writes. The live store is only read.
function copyLiveStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallpaper-store-'));
  const copy = path.join(dir, 'Index.plist');
  fs.copyFileSync(WALLPAPER_STORE_PATH, copy);
  return { dir, copy };
}

function readStore(file) {
  return execFileSync('/usr/bin/plutil', ['-convert', 'xml1', '-o', '-', file], { encoding: 'utf8' });
}

function extract(file, keyPath) {
  return execFileSync('/usr/bin/plutil', ['-extract', keyPath, 'raw', '-o', '-', file], { encoding: 'utf8' }).trim();
}

test('writeWallpaperStore puts one image on every Space and display', async () => {
  const { dir, copy } = copyLiveStore();
  const image = path.join(os.homedir(), 'Pictures', 'a wallpaper & more.jpg');
  const idleBefore = extract(copy, 'AllSpacesAndDisplays.Idle.Content.Choices.0.Provider');
  try {
    await writeWallpaperStore(copy, image);
    const url = `file://${encodeURI(image).replaceAll('&', '&amp;')}`;
    const xml = readStore(copy);

    assert.equal(extract(copy, 'AllSpacesAndDisplays.Type'), 'individual');
    assert.equal(extract(copy, 'AllSpacesAndDisplays.Desktop.Content.Choices.0.Provider'), 'com.apple.wallpaper.choice.image');
    assert.equal(extract(copy, 'SystemDefault.Desktop.Content.Choices.0.Files.0.relative'), `file://${encodeURI(image)}`);
    assert.equal(extract(copy, 'AllSpacesAndDisplays.Idle.Content.Choices.0.Provider'), idleBefore);
    assert.match(xml, /<key>Spaces<\/key>\s*<dict\/>/);
    assert.match(xml, /<key>Displays<\/key>\s*<dict\/>/);
    assert.ok(xml.includes(url));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('writeWallpaperStore refuses a store layout it does not recognize', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallpaper-store-'));
  const store = path.join(dir, 'Index.plist');
  fs.writeFileSync(store, JSON.stringify({ Displays: {}, Linked: {} }));
  execFileSync('/usr/bin/plutil', ['-convert', 'binary1', store]);
  try {
    await assert.rejects(writeWallpaperStore(store, '/tmp/x.jpg'), /layout this app does not support/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('writeWallpaperStore refuses the second store newer macOS versions add', async () => {
  const { dir, copy } = copyLiveStore();
  fs.writeFileSync(path.join(dir, 'Index2.plist'), '');
  try {
    await assert.rejects(writeWallpaperStore(copy, '/tmp/x.jpg'), /second wallpaper store/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('assertApplicable rejects missing files and unsupported types', async () => {
  await assert.rejects(assertApplicable('/tmp/does-not-exist.jpg'), /no longer exists/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallpaper-file-'));
  const svg = path.join(dir, 'art.svg');
  fs.writeFileSync(svg, '<svg/>');
  try {
    await assert.rejects(assertApplicable(svg), /not a supported image type/);
    await assert.rejects(assertApplicable(dir), /not a file/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

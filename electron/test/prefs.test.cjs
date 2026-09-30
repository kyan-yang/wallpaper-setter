const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { readPrefs, writePrefs } = require('../dist/main/prefs.js');

test('prefs start empty, round-trip, and fail loudly when malformed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallpaper-prefs-'));
  const file = path.join(dir, 'nested', 'prefs.json');
  try {
    assert.deepEqual(readPrefs(file), { folders: [], lastFolder: null, undo: [] });

    const prefs = { folders: ['/Volumes/Photos'], lastFolder: '/Users/me/Pictures', undo: ['/Users/me/a.jpg'] };
    writePrefs(file, prefs);
    assert.deepEqual(readPrefs(file), prefs);

    fs.writeFileSync(file, '{"folders": [1], "lastFolder": null, "undo": []}');
    assert.throws(() => readPrefs(file), /settings file .*prefs\.json is malformed \("folders"/);
    fs.writeFileSync(file, '{not json');
    assert.throws(() => readPrefs(file), /is malformed/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const assert = require('node:assert/strict');
const test = require('node:test');

const { applyWallpaper, buildWallpaperApplyCommand } = require('../dist/main/wallpaper.js');

test('buildWallpaperApplyCommand targets every desktop via System Events', () => {
  const filePath = '/tmp/example wallpaper.jpg';
  const { command, args } = buildWallpaperApplyCommand(filePath);

  assert.equal(command, 'osascript');
  assert.equal(args[args.length - 1], filePath);
  assert.match(args.join('\n'), /tell application "System Events"/);
  assert.match(args.join('\n'), /repeat with desktopRef in desktops/);
});

test('applyWallpaper rejects missing files', () => {
  assert.throws(
    () => applyWallpaper('/tmp/missing.jpg', { existsSync: () => false, execSync: () => undefined }),
    /File not found/
  );
});

test('applyWallpaper rejects unsupported file formats', () => {
  assert.throws(
    () => applyWallpaper('/tmp/wallpaper.svg', { existsSync: () => true, execSync: () => undefined }),
    /Unsupported format: svg/
  );
});

test('applyWallpaper executes exactly one osascript command', () => {
  const calls = [];
  const filePath = '/tmp/wallpaper.png';

  applyWallpaper(filePath, {
    existsSync: () => true,
    execSync: (command, args, options) => {
      calls.push({ command, args, options });
      return undefined;
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'osascript');
  assert.equal(calls[0].args[calls[0].args.length - 1], filePath);
  assert.deepEqual(calls[0].options, { timeout: 10000 });
});

test('applyWallpaper surfaces AppleScript stderr details', () => {
  const error = new Error('Command failed');
  error.stderr = Buffer.from('Not authorized to send Apple events to System Events.\n');

  assert.throws(
    () => applyWallpaper('/tmp/wallpaper.jpg', {
      existsSync: () => true,
      execSync: () => {
        throw error;
      },
    }),
    /Not authorized to send Apple events to System Events/
  );
});

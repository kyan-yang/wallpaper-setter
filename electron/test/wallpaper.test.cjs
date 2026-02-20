const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { applyWallpaper, buildWallpaperApplyCommand, patchWallpaperStoreXml } = require('../dist/main/wallpaper.js');

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

test('applyWallpaper executes osascript when wallpaper store is unavailable', () => {
  const calls = [];
  const filePath = '/tmp/wallpaper.png';

  applyWallpaper(filePath, {
    existsSync: (targetPath) => targetPath === filePath,
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

test('patchWallpaperStoreXml updates every relative wallpaper file reference', () => {
  const storeXml = [
    '<plist version="1.0"><dict>',
    '<key>Spaces</key><dict>',
    '<key>A</key><dict><key>relative</key><string>file:///old-a.jpg</string></dict>',
    '<key>B</key><dict><key>relative</key><string>file:///old-b.jpg</string></dict>',
    '</dict>',
    '<key>SystemDefault</key><dict><key>relative</key><string>file:///old-default.jpg</string></dict>',
    '</dict></plist>',
  ].join('');

  const nextURL = 'file:///Users/example/new & wallpaper.jpg';
  const result = patchWallpaperStoreXml(storeXml, nextURL);

  assert.equal(result.updates, 3);
  assert.match(result.rawStoreXml, /file:\/\/\/Users\/example\/new &amp; wallpaper\.jpg/);
  assert.doesNotMatch(result.rawStoreXml, /file:\/\/\/old-/);
});

test('applyWallpaper patches wallpaper store and refreshes wallpaper agent', () => {
  const filePath = '/tmp/wallpaper space.png';
  const commandCalls = [];
  let rewrittenStore = '';

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wallpaper-test-'));
  const homeDir = path.join(tempRoot, 'home');
  const storePath = path.join(homeDir, 'Library', 'Application Support', 'com.apple.wallpaper', 'Store', 'Index.plist');
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, 'placeholder');

  const sampleStoreXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<plist version="1.0">',
    '<dict>',
    '<key>Spaces</key>',
    '<dict>',
    '<key>Space1</key>',
    '<dict>',
    '<key>Default</key>',
    '<dict>',
    '<key>Desktop</key>',
    '<dict>',
    '<key>Content</key>',
    '<dict>',
    '<key>Choices</key>',
    '<array>',
    '<dict>',
    '<key>Files</key>',
    '<array>',
    '<dict><key>relative</key><string>file:///old.jpg</string></dict>',
    '</array>',
    '</dict>',
    '</array>',
    '</dict>',
    '</dict>',
    '</dict>',
    '</dict>',
    '</dict>',
    '</dict>',
    '</plist>',
  ].join('');

  try {
    applyWallpaper(filePath, {
      existsSync: (targetPath) => targetPath === filePath || targetPath === storePath || fs.existsSync(targetPath),
      homedir: () => homeDir,
      tmpdir: () => tempRoot,
      execSync: (command, args, options) => {
        commandCalls.push({ command, args, options });

        if (command === 'plutil' && args[0] === '-convert' && args[1] === 'xml1') {
          const xmlPath = args[3];
          fs.writeFileSync(xmlPath, sampleStoreXml);
        }

        if (command === 'plutil' && args[0] === '-convert' && args[1] === 'binary1') {
          rewrittenStore = fs.readFileSync(args[4], 'utf8');
        }

        return undefined;
      },
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }

  assert.equal(commandCalls[0].command, 'osascript');
  assert.ok(commandCalls.some((call) => call.command === 'plutil' && call.args[1] === 'xml1'));
  assert.ok(commandCalls.some((call) => call.command === 'plutil' && call.args[1] === 'binary1'));
  assert.ok(commandCalls.some((call) => call.command === 'killall' && call.args[0] === 'WallpaperAgent'));

  assert.match(rewrittenStore, /file:\/\/\/tmp\/wallpaper%20space\.png/);
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

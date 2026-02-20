const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { applyWallpaper, buildWallpaperApplyCommand, patchWallpaperStore } = require('../dist/main/wallpaper.js');

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

test('patchWallpaperStore updates every Desktop file reference', () => {
  const store = JSON.stringify({
    Spaces: {
      A: {
        Default: {
          Desktop: {
            Content: {
              Choices: [
                { Files: [{ relative: 'file:///old-a.jpg' }] },
              ],
            },
          },
        },
      },
      B: {
        Displays: {
          Display1: {
            Desktop: {
              Content: {
                Choices: [
                  { Files: [{ relative: 'file:///old-b.jpg' }] },
                ],
              },
            },
          },
        },
      },
    },
    SystemDefault: {
      Desktop: {
        Content: {
          Choices: [
            { Files: [{ relative: 'file:///old-default.jpg' }] },
          ],
        },
      },
    },
  });

  const nextURL = 'file:///Users/example/new%20wallpaper.jpg';
  const result = patchWallpaperStore(store, nextURL);
  const next = JSON.parse(result.rawStoreJson);

  assert.equal(result.updates, 3);
  assert.equal(next.Spaces.A.Default.Desktop.Content.Choices[0].Files[0].relative, nextURL);
  assert.equal(next.Spaces.B.Displays.Display1.Desktop.Content.Choices[0].Files[0].relative, nextURL);
  assert.equal(next.SystemDefault.Desktop.Content.Choices[0].Files[0].relative, nextURL);
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

  const sampleStore = JSON.stringify({
    Spaces: {
      Space1: {
        Default: {
          Desktop: {
            Content: {
              Choices: [{ Files: [{ relative: 'file:///old.jpg' }] }],
            },
          },
        },
      },
    },
  });

  try {
    applyWallpaper(filePath, {
      existsSync: (targetPath) => targetPath === filePath || targetPath === storePath || fs.existsSync(targetPath),
      homedir: () => homeDir,
      tmpdir: () => tempRoot,
      execSync: (command, args, options) => {
        commandCalls.push({ command, args, options });

        if (command === 'plutil' && args[0] === '-convert' && args[1] === 'json') {
          const jsonPath = args[3];
          fs.writeFileSync(jsonPath, sampleStore);
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
  assert.ok(commandCalls.some((call) => call.command === 'plutil' && call.args[1] === 'json'));
  assert.ok(commandCalls.some((call) => call.command === 'plutil' && call.args[1] === 'binary1'));
  assert.ok(commandCalls.some((call) => call.command === 'killall' && call.args[0] === 'WallpaperAgent'));

  const patched = JSON.parse(rewrittenStore);
  assert.match(patched.Spaces.Space1.Default.Desktop.Content.Choices[0].Files[0].relative, /file:\/\/\/tmp\/wallpaper%20space\.png$/);
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

import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { isImagePath } from '../shared/api';

// macOS has no public API that sets one wallpaper on every Space: NSWorkspace
// only changes the current Space, and it turns "Show on all Spaces" back off.
// So we write WallpaperAgent's store in its all-Spaces form (the same shape
// System Settings writes when "Show on all Spaces" is on), restart the agent,
// and confirm through NSWorkspace that every display now shows the image.

export const WALLPAPER_STORE_PATH = path.join(
  os.homedir(), 'Library', 'Application Support', 'com.apple.wallpaper', 'Store', 'Index.plist',
);

const READ_SCRIPT = `
ObjC.import('AppKit');
function run() {
  const ws = $.NSWorkspace.sharedWorkspace;
  const screens = $.NSScreen.screens;
  const paths = [];
  for (let i = 0; i < screens.count; i++) {
    paths.push(ObjC.unwrap(ws.desktopImageURLForScreen(screens.objectAtIndex(i)).path));
  }
  return JSON.stringify(paths);
}`;

const WRITE_STORE_SCRIPT = `
ObjC.import('AppKit');
function encode(value) {
  const err = Ref();
  const data = $.NSPropertyListSerialization.dataWithPropertyListFormatOptionsError(value, $.NSPropertyListBinaryFormat_v1_0, 0, err);
  if (data.isNil()) throw new Error('Could not encode the wallpaper settings: ' + ObjC.unwrap(err[0].localizedDescription));
  return data;
}
function run(argv) {
  const storePath = argv[0];
  const imagePath = argv[1];
  const err = Ref();
  const raw = $.NSData.dataWithContentsOfFile(storePath);
  if (raw.isNil()) throw new Error('Could not read the macOS wallpaper settings at ' + storePath + '.');
  const store = $.NSPropertyListSerialization.propertyListWithDataOptionsFormatError(raw, $.NSPropertyListMutableContainersAndLeaves, null, err);
  if (store.isNil()) throw new Error('Could not parse the macOS wallpaper settings: ' + ObjC.unwrap(err[0].localizedDescription));
  const keys = ObjC.deepUnwrap(store.allKeys).sort().join(', ');
  const all = store.objectForKey('AllSpacesAndDisplays');
  const systemDefault = store.objectForKey('SystemDefault');
  const linked = [all, systemDefault].some(function (record) {
    return !record.isNil() && (ObjC.unwrap(record.objectForKey('Type')) === 'linked' || !record.objectForKey('Linked').isNil());
  });
  if (keys !== 'AllSpacesAndDisplays, Displays, Spaces, SystemDefault' || linked) {
    throw new Error('This version of macOS stores wallpaper settings in a layout this app does not support (keys: ' + keys + ').');
  }
  const now = $.NSDate.date;
  const configuration = encode($({
    backgroundColor: { components: [0, 0, 0, 1], colorSpace: encode($('kCGColorSpaceGenericRGB')) },
    placement: 1,
  }));
  const desktop = $({
    Content: {
      Choices: [{
        Provider: 'com.apple.wallpaper.choice.image',
        Files: [{ relative: ObjC.unwrap($.NSURL.fileURLWithPath(imagePath).absoluteString) }],
        Configuration: configuration,
      }],
      Shuffle: '$null',
    },
    LastSet: now,
    LastUse: now,
  });
  const nextAll = $.NSMutableDictionary.dictionary;
  nextAll.setObjectForKey('individual', 'Type');
  nextAll.setObjectForKey(desktop, 'Desktop');
  const idle = all.objectForKey('Idle');
  if (!idle.isNil()) nextAll.setObjectForKey(idle, 'Idle');
  store.setObjectForKey(nextAll, 'AllSpacesAndDisplays');
  systemDefault.setObjectForKey(desktop, 'Desktop');
  store.setObjectForKey($.NSMutableDictionary.dictionary, 'Spaces');
  store.setObjectForKey($.NSMutableDictionary.dictionary, 'Displays');
  if (!encode(store).writeToFileAtomically(storePath, true)) {
    throw new Error('Could not write the macOS wallpaper settings at ' + storePath + '.');
  }
  return 'ok';
}`;

function exec(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

// osascript reports a thrown JXA error on stderr as
// "execution error: Error: <message> (-2700)".
async function jxa(script: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await exec('/usr/bin/osascript', ['-l', 'JavaScript', '-e', script, ...args]);
    return stdout.trim();
  } catch (error) {
    const stderr = String((error as { stderr?: string }).stderr ?? '').trim();
    const message = stderr.match(/execution error: (?:Error: )?(.*?)(?: \(-?\d+\))?$/s)?.[1];
    throw new Error(message || stderr || (error as Error).message);
  }
}

export async function readWallpapers(): Promise<string[]> {
  return JSON.parse(await jxa(READ_SCRIPT, [])) as string[];
}

export async function writeWallpaperStore(storePath: string, imagePath: string): Promise<void> {
  const index2 = path.join(path.dirname(storePath), 'Index2.plist');
  if (fs.existsSync(index2)) {
    throw new Error(`This version of macOS keeps a second wallpaper store (${index2}) that this app does not support.`);
  }
  await jxa(WRITE_STORE_SCRIPT, [storePath, imagePath]);
}

async function restartWallpaperAgent(): Promise<void> {
  try {
    await exec('/usr/bin/killall', ['WallpaperAgent']);
  } catch (error) {
    const stderr = String((error as { stderr?: string }).stderr ?? '');
    // Nothing to restart; launchd starts the agent on demand and the
    // readback below still verifies the result.
    if (!/No matching processes/i.test(stderr)) {
      throw new Error(`Could not restart WallpaperAgent: ${stderr.trim() || (error as Error).message}`);
    }
  }
}

export async function assertApplicable(imagePath: string): Promise<void> {
  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(imagePath);
  } catch {
    throw new Error(`${imagePath} no longer exists.`);
  }
  if (!stat.isFile()) throw new Error(`${imagePath} is not a file.`);
  if (!isImagePath(imagePath)) throw new Error(`${path.basename(imagePath)} is not a supported image type.`);
}

export async function setWallpaper(imagePath: string): Promise<void> {
  await assertApplicable(imagePath);
  await writeWallpaperStore(WALLPAPER_STORE_PATH, imagePath);
  await restartWallpaperAgent();

  const deadline = Date.now() + 5000;
  let shown: string[] = [];
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    shown = await readWallpapers();
    if (shown.length > 0 && shown.every((p) => p === imagePath)) return;
  }
  throw new Error(`macOS still shows ${shown.join(', ') || 'no wallpaper'} after setting ${imagePath}.`);
}

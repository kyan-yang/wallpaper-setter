import fs from 'fs';
import path from 'path';

export interface Prefs {
  // Extra tree roots the user added.
  folders: string[];
  lastFolder: string | null;
  // Wallpapers to restore on undo, most recent last.
  undo: string[];
}

const DEFAULT_PREFS: Prefs = { folders: [], lastFolder: null, undo: [] };

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function readPrefs(file: string): Prefs {
  if (!fs.existsSync(file)) return { ...DEFAULT_PREFS, folders: [], undo: [] };

  const malformed = (reason: string) =>
    new Error(`Your settings file ${file} is malformed (${reason}). Fix or delete it, then reopen the app.`);

  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw malformed((error as Error).message);
  }
  const prefs = data as Record<string, unknown>;
  if (!prefs || typeof prefs !== 'object') throw malformed('expected an object');
  if (!isStringArray(prefs.folders)) throw malformed('"folders" must be a list of paths');
  if (prefs.lastFolder !== null && typeof prefs.lastFolder !== 'string') throw malformed('"lastFolder" must be a path or null');
  if (!isStringArray(prefs.undo)) throw malformed('"undo" must be a list of paths');
  return { folders: prefs.folders, lastFolder: prefs.lastFolder as string | null, undo: prefs.undo };
}

export function writePrefs(file: string, prefs: Prefs): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(prefs, null, 2));
  fs.renameSync(temp, file);
}

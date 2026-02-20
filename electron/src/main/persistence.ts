import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { DEFAULT_GOALS_THEME_COLOR, normalizeGoalsDraft } from '../shared/goals-theme';

interface HistoryEntry {
  id: string;
  fileURL: string;
  createdAt: string;
  source: string;
  metadata: Record<string, string>;
}

interface GoalsDraft {
  title: string;
  goalsText: string;
  theme: string;
}

interface StateEnvelope {
  history: HistoryEntry[];
  goalsDraft: GoalsDraft;
  lastAppliedPath: string | null;
}

const DEFAULT_STATE: StateEnvelope = {
  history: [],
  goalsDraft: { title: '', goalsText: '', theme: DEFAULT_GOALS_THEME_COLOR },
  lastAppliedPath: null,
};

function normalizeStateEnvelope(state: unknown): StateEnvelope {
  const source = (state && typeof state === 'object') ? state as Record<string, unknown> : {};

  return {
    history: Array.isArray(source.history) ? source.history as HistoryEntry[] : [],
    goalsDraft: normalizeGoalsDraft(source.goalsDraft),
    lastAppliedPath: typeof source.lastAppliedPath === 'string' ? source.lastAppliedPath : null,
  };
}

function storagePath(): string {
  return path.join(app.getPath('userData'), 'state.json');
}

function load(): StateEnvelope {
  const p = storagePath();
  if (!fs.existsSync(p)) return { ...DEFAULT_STATE, history: [] };
  try {
    return normalizeStateEnvelope(JSON.parse(fs.readFileSync(p, 'utf-8')));
  } catch {
    return { ...DEFAULT_STATE, history: [] };
  }
}

function save(state: StateEnvelope): void {
  const p = storagePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(state, null, 2), 'utf-8');
}

export function bootstrap() {
  return load();
}

export function addHistoryEntry(entry: HistoryEntry): void {
  const state = load();
  state.history = [entry, ...state.history.filter((e) => e.id !== entry.id)];
  save(state);
}

export function saveLastApplied(filePath: string): void {
  const state = load();
  state.lastAppliedPath = filePath;
  save(state);
}

export function saveGoalsDraft(draft: GoalsDraft): void {
  const state = load();
  state.goalsDraft = normalizeGoalsDraft(draft);
  save(state);
}

export function deleteHistoryEntry(id: string): void {
  const state = load();
  state.history = state.history.filter((e) => e.id !== id);
  save(state);
}

export function clearHistory(): void {
  const state = load();
  state.history = [];
  save(state);
}

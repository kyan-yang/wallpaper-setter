// One cache of folder listings and image counts, shared by the sidebar tree and
// the main pane so a folder-change event refreshes both from a single fetch.
import { useSyncExternalStore } from 'react';
import { errorMessage, type FolderListing } from '../shared/api';

export type Load<T> =
  | { status: 'loading' }
  | { status: 'ready'; value: T }
  | { status: 'error'; message: string };

interface Store {
  listings: Record<string, Load<FolderListing>>;
  counts: Record<string, Load<number>>;
}

let store: Store = { listings: {}, counts: {} };
const listeners = new Set<() => void>();
// Latest request per key, so a slow response never overwrites a newer one.
const latest = new Map<string, number>();
let requestCounter = 0;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function update<K extends keyof Store>(table: K, entries: Store[K]) {
  store = { ...store, [table]: { ...store[table], ...entries } };
  listeners.forEach((listener) => listener());
}

function track<K extends keyof Store>(table: K, dir: string, request: () => Promise<unknown>) {
  const key = `${table}\u0000${dir}`;
  const id = ++requestCounter;
  latest.set(key, id);
  request().then(
    (value) => {
      if (latest.get(key) === id) update(table, { [dir]: { status: 'ready', value } } as Store[K]);
    },
    (error) => {
      if (latest.get(key) === id) update(table, { [dir]: { status: 'error', message: errorMessage(error) } } as Store[K]);
    },
  );
}

// Fetches a listing, keeping any listing already shown until the new one arrives.
export function loadListing(dir: string) {
  const current = store.listings[dir];
  if (!current || current.status === 'error') update('listings', { [dir]: { status: 'loading' } });
  track('listings', dir, () => window.api.listFolder(dir));
}

export function ensureListing(dir: string) {
  if (!store.listings[dir]) loadListing(dir);
}

export function ensureCounts(dirs: string[]) {
  const missing = dirs.filter((dir) => !store.counts[dir]);
  if (missing.length === 0) return;
  update('counts', Object.fromEntries(missing.map((dir) => [dir, { status: 'loading' }])));
  missing.forEach((dir) => track('counts', dir, () => window.api.countImages(dir)));
}

// Called when the watched folder changes on disk.
export function refreshFolder(dir: string) {
  if (store.listings[dir]) loadListing(dir);
  if (store.counts[dir]) track('counts', dir, () => window.api.countImages(dir));
}

export function useFolderStore(): Store {
  return useSyncExternalStore(subscribe, () => store);
}

export function useListing(dir: string): Load<FolderListing> | undefined {
  return useSyncExternalStore(subscribe, () => store.listings[dir]);
}

export function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1) || path;
}

export function dirname(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash <= 0 ? '/' : path.slice(0, slash);
}

export function isWithin(path: string, root: string): boolean {
  return path === root || path.startsWith(root.endsWith('/') ? root : `${root}/`);
}

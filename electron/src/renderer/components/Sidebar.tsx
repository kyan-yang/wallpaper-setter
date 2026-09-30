import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ChevronRight, CircleAlert, Folder, House, Plus, X } from 'lucide-react';
import { basename, ensureCounts, ensureListing, isWithin, loadListing, useFolderStore, type Load } from '../folders';

interface SidebarProps {
  home: string;
  roots: string[];
  openDir: string;
  onOpen: (dir: string) => void;
  onRemoveRoot: (dir: string) => void;
  onAddFolder: () => void;
}

interface Item {
  kind: 'item';
  id: string;
  path: string;
  name: string;
  level: number;
  root: string;
  parentId: string | null;
  posinset: number;
  setsize: number;
  removable: boolean;
  expandable: boolean;
  expanded: boolean;
  firstExtra: boolean;
}

interface Status {
  kind: 'status';
  id: string;
  level: number;
  text: string;
  tone: 'loading' | 'error';
}

// The same folder can appear under two roots (home and an added subfolder),
// so a row is identified by its root and its path.
const rowId = (root: string, path: string) => `${root}\u0000${path}`;

const levelStyle = (level: number) => ({ '--level': level }) as CSSProperties;

export function Sidebar({ home, roots, openDir, onOpen, onRemoveRoot, onAddFolder }: SidebarProps) {
  const { listings, counts } = useFolderStore();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([home]));
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const pendingScroll = useRef<string | null>(null);

  const allRoots = useMemo(() => [home, ...roots.filter((root) => root !== home)], [home, roots]);

  const rows = useMemo(() => {
    const out: (Item | Status)[] = [];
    const walk = (root: string, path: string, name: string, level: number, parentId: string | null, posinset: number, setsize: number, firstExtra: boolean) => {
      const id = rowId(root, path);
      const entry = listings[path];
      const folders = entry?.status === 'ready' ? entry.value.folders : null;
      const expandable = folders === null || folders.length > 0;
      const isExpanded = expanded.has(path);
      out.push({
        kind: 'item', id, path, name, level, root, parentId, posinset, setsize, firstExtra,
        removable: level === 1 && root !== home,
        expandable,
        expanded: expandable && isExpanded,
      });
      if (!isExpanded) return;
      if (!entry || entry.status === 'loading') {
        out.push({ kind: 'status', id: `${id}\u0000status`, level: level + 1, text: 'Loading…', tone: 'loading' });
      } else if (entry.status === 'error') {
        out.push({ kind: 'status', id: `${id}\u0000status`, level: level + 1, text: entry.message, tone: 'error' });
      } else {
        entry.value.folders.forEach((folder, index, all) =>
          walk(root, folder.path, folder.name, level + 1, id, index + 1, all.length, false),
        );
      }
    };
    allRoots.forEach((root, index) => walk(root, root, basename(root), 1, null, index + 1, allRoots.length, index === 1));
    return out;
  }, [listings, expanded, allRoots, home]);

  const items = useMemo(() => rows.filter((row): row is Item => row.kind === 'item'), [rows]);

  useEffect(() => {
    ensureListing(home);
  }, [home]);

  useEffect(() => {
    ensureCounts(items.map((item) => item.path));
  }, [items]);

  // Reveal the open folder: if a row for it is already visible (the user clicked it),
  // keep that row; otherwise expand its ancestors under the most specific root.
  useEffect(() => {
    const visible = items.filter((item) => item.path === openDir);
    const target = visible.find((item) => item.id === focusedId) ?? visible[0];
    if (target) {
      setExpanded((prev) => new Set(prev).add(openDir));
      setFocusedId(target.id);
      pendingScroll.current = target.id;
      return;
    }
    const root = allRoots.filter((candidate) => isWithin(openDir, candidate)).sort((a, b) => b.length - a.length)[0];
    if (!root) return;
    const chain = [root];
    for (const segment of openDir.slice(root.length).split('/').filter(Boolean)) {
      const parent = chain[chain.length - 1];
      chain.push(parent.endsWith('/') ? parent + segment : `${parent}/${segment}`);
    }
    chain.slice(0, -1).forEach(ensureListing);
    setExpanded((prev) => new Set([...prev, ...chain]));
    setFocusedId(rowId(root, openDir));
    pendingScroll.current = rowId(root, openDir);
    // Reveal only when the open folder changes; the rows it reads are this render's.
  }, [openDir]);

  useEffect(() => {
    const id = pendingScroll.current;
    const row = id ? rowRefs.current.get(id) : undefined;
    if (!row) return;
    row.scrollIntoView({ block: 'nearest' });
    pendingScroll.current = null;
  });

  const tabStopId = items.some((item) => item.id === focusedId)
    ? focusedId
    : (items.find((item) => item.path === openDir) ?? items[0])?.id;

  const focusItem = (item: Item | undefined) => {
    if (!item) return;
    setFocusedId(item.id);
    rowRefs.current.get(item.id)?.focus();
  };

  const expand = (path: string) => {
    loadListing(path);
    setExpanded((prev) => new Set(prev).add(path));
  };

  const collapse = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });

  // Opening loads the listing in the main pane, which the tree shares.
  const open = (item: Item) => {
    onOpen(item.path);
    setExpanded((prev) => new Set(prev).add(item.path));
  };

  const remove = (item: Item) => {
    focusItem(items[items.indexOf(item) - 1]);
    onRemoveRoot(item.path);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if ((event.target as HTMLElement).getAttribute('role') !== 'treeitem') return;
    const index = items.findIndex((item) => item.id === focusedId);
    const item = items[index];
    if (!item) return;
    switch (event.key) {
      case 'ArrowDown':
        focusItem(items[index + 1]);
        break;
      case 'ArrowUp':
        focusItem(items[index - 1]);
        break;
      case 'ArrowRight':
        if (item.expandable && !item.expanded) expand(item.path);
        else if (item.expanded && items[index + 1]?.parentId === item.id) focusItem(items[index + 1]);
        break;
      case 'ArrowLeft':
        if (item.expanded) collapse(item.path);
        else focusItem(items.find((candidate) => candidate.id === item.parentId));
        break;
      case 'Home':
        focusItem(items[0]);
        break;
      case 'End':
        focusItem(items[items.length - 1]);
        break;
      case 'Enter':
        open(item);
        break;
      case 'Delete':
      case 'Backspace':
        if (!item.removable) return;
        remove(item);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top drag" />
      <div className="tree" role="tree" aria-label="Folders" onKeyDown={onKeyDown}>
        {rows.map((row) =>
          row.kind === 'status' ? (
            <div key={row.id} role="none" className={`tree-status is-${row.tone}`} style={levelStyle(row.level)}>
              {row.text}
            </div>
          ) : (
            <div
              key={row.id}
              ref={(element) => {
                if (element) rowRefs.current.set(row.id, element);
                else rowRefs.current.delete(row.id);
              }}
              role="treeitem"
              aria-level={row.level}
              aria-posinset={row.posinset}
              aria-setsize={row.setsize}
              aria-expanded={row.expandable ? row.expanded : undefined}
              aria-selected={row.path === openDir}
              tabIndex={row.id === tabStopId ? 0 : -1}
              className={`tree-row${row.firstExtra ? ' is-first-extra' : ''}${row.removable ? ' is-removable' : ''}`}
              style={levelStyle(row.level)}
              title={row.level === 1 ? row.path : undefined}
              onFocus={() => setFocusedId(row.id)}
              onClick={() => open(row)}
            >
              <span
                className={`tree-chevron${row.expandable ? '' : ' is-leaf'}${row.expanded ? ' is-open' : ''}`}
                aria-hidden="true"
                onClick={(event) => {
                  event.stopPropagation();
                  if (row.expanded) collapse(row.path);
                  else if (row.expandable) expand(row.path);
                }}
              >
                <ChevronRight size={12} strokeWidth={2.5} />
              </span>
              {row.path === home ? <House size={15} className="tree-icon" /> : <Folder size={15} className="tree-icon" />}
              <span className="tree-name">{row.name}</span>
              <Count entry={counts[row.path]} />
              {row.removable && (
                <button
                  type="button"
                  className="tree-remove"
                  tabIndex={-1}
                  title="Remove from sidebar"
                  aria-label={`Remove ${row.name} from sidebar`}
                  onClick={(event) => {
                    event.stopPropagation();
                    remove(row);
                  }}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              )}
            </div>
          ),
        )}
      </div>
      <div className="sidebar-footer">
        <button type="button" className="sidebar-add" onClick={onAddFolder}>
          <Plus size={15} />
          Add folder
        </button>
      </div>
    </aside>
  );
}

function Count({ entry }: { entry: Load<number> | undefined }) {
  if (entry?.status === 'error') {
    return (
      <span className="tree-count is-error" title={entry.message} aria-label={`Couldn’t count images: ${entry.message}`}>
        <CircleAlert size={12} />
      </span>
    );
  }
  if (entry?.status !== 'ready' || entry.value === 0) return null;
  return <span className="tree-count">{entry.value}</span>;
}

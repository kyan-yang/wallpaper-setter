import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { LoaderCircle, TriangleAlert } from 'lucide-react';
import { errorMessage, isImagePath, type BootState, type ImageEntry, type MenuCommand } from '../shared/api';
import { basename, dirname, isWithin, loadListing, refreshFolder, useListing } from './folders';
import { Actions, ErrorBanner, type Busy } from './components/Actions';
import { Desktop, DesktopImage, previewSrc, tileSrc } from './components/Desktop';
import { FullPreview } from './components/FullPreview';
import { Grid, gridColumns, tileAt } from './components/Grid';
import { Sidebar } from './components/Sidebar';

const HINT = 'Arrow keys browse · Space full preview · Return sets · ⌘Z undoes · ⌘O opens any folder';
const CONFIRM_MS = 1500;
const NO_IMAGES: ImageEntry[] = [];

interface Booted {
  boot: BootState;
  tokens: CSSProperties;
}

export function App() {
  const [booted, setBooted] = useState<Booted | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setBootError(null);
    window.api.boot().then(
      (boot) => {
        if (cancelled) return;
        try {
          setBooted({ boot, tokens: themeTokens(boot) });
        } catch (error) {
          setBootError(errorMessage(error));
        }
      },
      (error) => {
        if (!cancelled) setBootError(errorMessage(error));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (bootError !== null) return <BootFailure message={bootError} onRetry={() => setAttempt((n) => n + 1)} />;
  if (!booted) return <BootWaiting />;
  return <Workspace boot={booted.boot} tokens={booted.tokens} />;
}

interface Handlers {
  onKey: (event: KeyboardEvent) => void;
  onMenu: (command: MenuCommand) => void;
  onDrop: (event: DragEvent) => void;
}

function Workspace({ boot, tokens }: Booted) {
  const [roots, setRoots] = useState(boot.folders);
  const [wallpaper, setWallpaper] = useState(boot.wallpaper);
  const [canUndo, setCanUndo] = useState(boot.canUndo);
  const [openDir, setOpenDir] = useState(() => boot.lastFolder ?? (boot.wallpaper ? dirname(boot.wallpaper) : boot.home));
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [justSet, setJustSet] = useState<string | null>(null);
  const [fullPreview, setFullPreview] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);

  const shellRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const openDirRef = useRef(openDir);
  // Set when a different folder opens; consumed once its listing arrives.
  const openIntent = useRef<{ select: string | null } | null>({ select: null });
  const lastImages = useRef<ImageEntry[]>(NO_IMAGES);
  const busyRef = useRef(false);
  const confirmTimer = useRef<number>();
  const wasOverlayOpen = useRef(false);
  const handlers = useRef<Handlers>();

  const entry = useListing(openDir);
  const images = entry?.status === 'ready' ? entry.value.images : NO_IMAGES;
  const selectedIndex = useMemo(() => images.findIndex((image) => image.path === selected), [images, selected]);
  const selectedImage = selectedIndex === -1 ? null : images[selectedIndex];
  const overlayOpen = fullPreview && selectedImage !== null;

  const showError = useCallback((cause: unknown) => setError(errorMessage(cause)), []);

  const activate = useCallback(
    (dir: string) => {
      loadListing(dir);
      window.api.rememberFolder(dir).catch(showError);
      window.api.watchFolder(dir).catch(showError);
    },
    [showError],
  );

  const openFolder = useCallback(
    (dir: string, select: string | null = null) => {
      if (dir === openDirRef.current) {
        if (select) setSelected(select);
        loadListing(dir);
        return;
      }
      openDirRef.current = dir;
      openIntent.current = { select };
      setOpenDir(dir);
      setSelected(null);
      activate(dir);
    },
    [activate],
  );

  useEffect(() => {
    activate(openDirRef.current);
  }, [activate]);

  // Resolve the selection whenever the open folder's listing changes. A fresh open
  // selects the requested image, else the current wallpaper, else the first image;
  // a refresh keeps the selection, or its position if the file went away.
  // Layout effect, so the preview never paints a frame without a selection.
  useLayoutEffect(() => {
    if (entry?.status !== 'ready') return;
    const list = entry.value.images;
    const has = (path: string | null): path is string => path !== null && list.some((image) => image.path === path);
    const intent = openIntent.current;
    if (intent) {
      openIntent.current = null;
      setSelected(has(intent.select) ? intent.select : has(wallpaper) ? wallpaper : list[0]?.path ?? null);
    } else {
      setSelected((prev) => {
        if (has(prev)) return prev;
        const oldIndex = prev === null ? -1 : lastImages.current.findIndex((image) => image.path === prev);
        return list[Math.min(Math.max(oldIndex, 0), list.length - 1)]?.path ?? null;
      });
    }
    lastImages.current = list;
    // Runs per listing; `wallpaper` is read as of that render.
  }, [entry]);

  useEffect(() => () => window.clearTimeout(confirmTimer.current), []);

  // The background is inert while the full preview is open; focus returns to the selected tile.
  useEffect(() => {
    if (shellRef.current) shellRef.current.inert = overlayOpen;
    if (wasOverlayOpen.current && !overlayOpen && selectedIndex !== -1) {
      tileAt(gridRef.current, selectedIndex)?.focus({ preventScroll: true });
    }
    wasOverlayOpen.current = overlayOpen;
  }, [overlayOpen]);

  const setAsWallpaper = async () => {
    if (!selectedImage || busyRef.current) return;
    const { path } = selectedImage;
    busyRef.current = true;
    setBusy('set');
    setJustSet(null);
    try {
      const next = await window.api.setWallpaper(path);
      setWallpaper(next.wallpaper);
      setCanUndo(next.canUndo);
      setError(null);
      setJustSet(path);
      window.clearTimeout(confirmTimer.current);
      confirmTimer.current = window.setTimeout(() => setJustSet(null), CONFIRM_MS);
    } catch (cause) {
      showError(cause);
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const undo = async () => {
    if (!canUndo || busyRef.current) return;
    busyRef.current = true;
    setBusy('undo');
    setJustSet(null);
    try {
      const next = await window.api.undoWallpaper();
      setWallpaper(next.wallpaper);
      setCanUndo(next.canUndo);
      setError(null);
    } catch (cause) {
      showError(cause);
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const chooseFolder = async () => {
    try {
      const dir = await window.api.chooseFolder();
      if (dir === null) return;
      setRoots(await window.api.addFolder(dir));
      openFolder(dir);
    } catch (cause) {
      showError(cause);
    }
  };

  const removeRoot = (dir: string) => {
    window.api.removeFolder(dir).then(setRoots, showError);
  };

  const reveal = (path: string) => {
    window.api.revealInFinder(path).catch(showError);
  };

  const dropPath = async (path: string, isDirectory: boolean) => {
    try {
      if (isDirectory) {
        setRoots(await window.api.addFolder(path));
        openFolder(path);
        return;
      }
      if (!isImagePath(path)) {
        setError(`“${basename(path)}” isn’t a folder or a supported image.`);
        return;
      }
      const dir = dirname(path);
      if (![boot.home, ...roots].some((root) => isWithin(dir, root))) setRoots(await window.api.addFolder(dir));
      openFolder(dir, path);
    } catch (cause) {
      showError(cause);
    }
  };

  // Up/Down move by the grid's real column count; in the full preview every arrow steps by one.
  const move = (key: string) => {
    if (images.length === 0) return;
    const last = images.length - 1;
    const columns = overlayOpen ? 1 : gridColumns(gridRef.current);
    const current = selectedIndex;
    let next = 0;
    if (current !== -1) {
      if (key === 'ArrowLeft') next = Math.max(current - 1, 0);
      else if (key === 'ArrowRight') next = Math.min(current + 1, last);
      else if (key === 'ArrowUp') next = current - columns >= 0 ? current - columns : current;
      else if (current + columns <= last) next = current + columns;
      else next = Math.floor(last / columns) > Math.floor(current / columns) ? last : current;
    }
    setSelected(images[next].path);
    if (!overlayOpen) tileAt(gridRef.current, next)?.focus({ preventScroll: true });
  };

  handlers.current = {
    onKey: (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      // Return and Space activate a focused button, so leave them alone there.
      const onControl = target?.closest('button, input, textarea, select, a[href]') != null;
      switch (event.key) {
        case 'Escape':
          if (overlayOpen) setFullPreview(false);
          else if (error !== null) setError(null);
          else return;
          break;
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          move(event.key);
          break;
        case 'Enter':
          if (onControl || event.repeat) return;
          void setAsWallpaper();
          break;
        case ' ':
          if (onControl || event.repeat) return;
          if (overlayOpen) setFullPreview(false);
          else if (selectedImage) setFullPreview(true);
          else return;
          break;
        default:
          return;
      }
      event.preventDefault();
    },
    onMenu: (command) => {
      if (command === 'open-folder') void chooseFolder();
      else void undo();
    },
    onDrop: (event) => {
      const transfer = event.dataTransfer;
      const file = transfer?.files[0];
      if (!transfer || !file) return;
      const isDirectory = transfer.items[0]?.webkitGetAsEntry()?.isDirectory ?? false;
      void dropPath(window.api.pathForFile(file), isDirectory);
    },
  };

  useEffect(() => {
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;
    const onKeyDown = (event: KeyboardEvent) => handlers.current?.onKey(event);
    const onDragEnter = (event: DragEvent) => {
      event.preventDefault();
      if (hasFiles(event)) setDragDepth((depth) => depth + 1);
    };
    const onDragLeave = (event: DragEvent) => {
      if (hasFiles(event)) setDragDepth((depth) => Math.max(0, depth - 1));
    };
    const onDragOver = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = hasFiles(event) ? 'copy' : 'none';
    };
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      setDragDepth(0);
      handlers.current?.onDrop(event);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    const stopMenu = window.api.onMenu((command) => handlers.current?.onMenu(command));
    const stopWatching = window.api.onFolderChanged(refreshFolder);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
      stopMenu();
      stopWatching();
    };
  }, []);

  const folderName = basename(openDir);
  const settled = entry !== undefined && entry.status !== 'loading';
  // With nothing selectable, the preview shows the current wallpaper instead.
  const showsWallpaper = settled && !selectedImage && wallpaper !== '';
  const file = selectedImage ?? (showsWallpaper ? { path: wallpaper, name: basename(wallpaper) } : null);

  let preview;
  if (selectedImage) {
    preview = (
      <Desktop label={`${selectedImage.name} as your wallpaper`}>
        <DesktopImage key={selectedImage.path} sources={[tileSrc(selectedImage), previewSrc(selectedImage.path, selectedImage.mtimeMs)]} />
      </Desktop>
    );
  } else if (!settled) {
    preview = <Desktop label="Loading preview" loading />;
  } else if (showsWallpaper && isImagePath(wallpaper)) {
    preview = (
      <Desktop label={`Current wallpaper, ${basename(wallpaper)}`}>
        <DesktopImage key={wallpaper} sources={[previewSrc(wallpaper, 0)]} />
      </Desktop>
    );
  } else {
    preview = (
      <Desktop label="No preview">
        <div className="desktop-message">The current wallpaper can’t be previewed</div>
      </Desktop>
    );
  }

  const status = busy === 'set' ? 'Setting wallpaper…' : busy === 'undo' ? 'Undoing…' : justSet ? 'Wallpaper set' : '';

  return (
    <div className="app" style={tokens}>
      <div className="shell" ref={shellRef}>
        <Sidebar
          home={boot.home}
          roots={roots}
          openDir={openDir}
          onOpen={openFolder}
          onRemoveRoot={removeRoot}
          onAddFolder={() => void chooseFolder()}
        />
        <main className="main">
          <header className="main-header drag">
            <h1 className="main-title" title={openDir}>
              {folderName}
            </h1>
            {entry?.status === 'ready' && (
              <span className="main-count">{images.length === 1 ? '1 image' : `${images.length} images`}</span>
            )}
          </header>
          <div className="main-body">
            <section className="stage" aria-label="Preview">
              <div className="stage-column">
                {preview}
                <Actions
                  file={file}
                  canSet={selectedImage !== null}
                  canUndo={canUndo}
                  busy={busy}
                  justSet={justSet !== null && justSet === selectedImage?.path}
                  isCurrent={file !== null && file.path === wallpaper}
                  onSet={() => void setAsWallpaper()}
                  onUndo={() => void undo()}
                  onReveal={reveal}
                />
                {error !== null && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
              </div>
              <p className="hint">{HINT}</p>
            </section>
            <Grid
              key={openDir}
              entry={entry}
              folderName={folderName}
              selectedIndex={selectedIndex}
              wallpaper={wallpaper}
              gridRef={gridRef}
              onSelect={setSelected}
              onRetry={() => loadListing(openDir)}
            />
          </div>
        </main>
      </div>
      {fullPreview && selectedImage && (
        <FullPreview
          image={selectedImage}
          screenWidth={boot.screen.width}
          isCurrent={selectedImage.path === wallpaper}
          busy={busy}
          justSet={justSet === selectedImage.path}
          error={error}
          onDismissError={() => setError(null)}
          onClose={() => setFullPreview(false)}
        />
      )}
      {dragDepth > 0 && (
        <div className="drop-overlay" aria-hidden="true">
          <span className="drop-label">Drop a folder to add it, or an image to open it</span>
        </div>
      )}
      <div className="sr-only" role="status">
        {status}
      </div>
    </div>
  );
}

function themeTokens(boot: BootState): CSSProperties {
  const { fill, on } = accentFill(boot.accentColor);
  return {
    '--accent': boot.accentColor,
    '--accent-fill': fill,
    '--on-accent': on,
    '--screen-aspect': String(boot.screen.width / boot.screen.height),
  } as CSSProperties;
}

// The Set button is the one accent-filled control, so its label must stay readable
// on every macOS accent: light accents get dark text, the rest are darkened just
// enough for white text to reach 4.5:1.
function accentFill(hex: string): { fill: string; on: string } {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Expected the accent color as #rrggbb but got “${hex}”.`);
  const value = parseInt(match[1], 16);
  const rgb = [value >> 16, (value >> 8) & 255, value & 255];
  const luminance = (color: number[]) => {
    const [r, g, b] = color.map((channel) => {
      const s = channel / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  if ((luminance(rgb) + 0.05) / 0.05 >= 7) return { fill: hex, on: '#1d1d1f' };
  for (let step = 0; ; step++) {
    const shade = rgb.map((channel) => Math.round(channel * (1 - step / 50)));
    if (1.05 / (luminance(shade) + 0.05) >= 4.5) return { fill: `rgb(${shade.join(' ')})`, on: '#ffffff' };
  }
}

// Same frame as the workspace, so the window does not flash when boot resolves.
function BootWaiting() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-top drag" />
      </aside>
      <main className="main">
        <header className="main-header drag" />
        <div className="boot-waiting" role="status" aria-label="Loading">
          <LoaderCircle size={18} className="spin" />
        </div>
      </main>
    </div>
  );
}

function BootFailure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="boot-failure drag">
      <div className="boot-card" role="alert">
        <TriangleAlert size={26} className="boot-icon" />
        <h1 className="boot-title">Wallpaper Setter couldn’t start</h1>
        <p className="boot-message selectable">{message}</p>
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}

import { memo, useEffect, useState, type RefObject } from 'react';
import { Check, ImageOff, Images, TriangleAlert } from 'lucide-react';
import type { FolderListing, ImageEntry } from '../../shared/api';
import type { Load } from '../folders';
import { tileSrc } from './Desktop';

const SKELETON_TILES = 10;

// Column count as laid out right now, so Up/Down move by a real row.
export function gridColumns(grid: HTMLElement | null): number {
  if (!grid) return 1;
  return getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
}

export function tileAt(grid: HTMLElement | null, index: number): HTMLElement | null {
  return grid?.querySelector<HTMLElement>(`[data-index="${index}"]`) ?? null;
}

interface GridProps {
  entry: Load<FolderListing> | undefined;
  folderName: string;
  selectedIndex: number;
  wallpaper: string;
  gridRef: RefObject<HTMLDivElement>;
  onSelect: (path: string) => void;
  onRetry: () => void;
}

export function Grid({ entry, folderName, selectedIndex, wallpaper, gridRef, onSelect, onRetry }: GridProps) {
  useEffect(() => {
    if (selectedIndex !== -1) tileAt(gridRef.current, selectedIndex)?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, gridRef]);

  if (!entry || entry.status === 'loading') {
    return (
      <div className="grid-scroll">
        <div className="grid" aria-busy="true" aria-label={`Loading ${folderName}`}>
          {Array.from({ length: SKELETON_TILES }, (_, index) => (
            <div key={index} className="tile" aria-hidden="true">
              <div className="tile-frame skeleton" />
              <span className="tile-name-skeleton skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (entry.status === 'error') {
    return (
      <div className="grid-scroll">
        <div className="grid-state" role="alert">
          <TriangleAlert size={22} className="grid-state-icon is-error" />
          <p className="grid-state-title">Couldn’t open {folderName}</p>
          <p className="grid-state-text selectable">{entry.message}</p>
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const images = entry.value.images;
  if (images.length === 0) {
    return (
      <div className="grid-scroll">
        <div className="grid-state">
          <Images size={22} className="grid-state-icon" />
          <p className="grid-state-title">No images in {folderName}</p>
          <p className="grid-state-text">Pick another folder in the sidebar, press ⌘O, or drop a folder onto the window.</p>
        </div>
      </div>
    );
  }

  const tabStop = selectedIndex === -1 ? 0 : selectedIndex;
  return (
    <div className="grid-scroll">
      <div className="grid" role="listbox" aria-label={`Images in ${folderName}`} ref={gridRef}>
        {images.map((image, index) => (
          <Tile
            key={`${image.path}\u0000${image.mtimeMs}`}
            image={image}
            index={index}
            selected={index === selectedIndex}
            current={image.path === wallpaper}
            tabbable={index === tabStop}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

interface TileProps {
  image: ImageEntry;
  index: number;
  selected: boolean;
  current: boolean;
  tabbable: boolean;
  onSelect: (path: string) => void;
}

const Tile = memo(function Tile({ image, index, selected, current, tabbable, onSelect }: TileProps) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={tabbable ? 0 : -1}
      data-index={index}
      className="tile"
      title={image.name}
      onClick={() => onSelect(image.path)}
    >
      <div className="tile-frame">
        {failed ? (
          <ImageOff size={18} className="tile-broken" aria-label="Can’t preview this image" />
        ) : (
          <img
            src={tileSrc(image)}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setFailed(true)}
          />
        )}
        {current && (
          <span className="tile-badge">
            <Check size={10} strokeWidth={3} />
            Current
          </span>
        )}
      </div>
      <span className="tile-name">{image.name}</span>
    </div>
  );
});

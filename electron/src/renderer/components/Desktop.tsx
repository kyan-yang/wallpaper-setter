import { useState, type ReactNode } from 'react';
import { ImageOff } from 'lucide-react';
import { imageUrl, type ImageEntry } from '../../shared/api';

// Requested sizes in CSS pixels. They are constants so the preview can reuse
// the exact tile URL the grid already loaded.
const TILE_CSS = 240;
const PREVIEW_CSS = 960;

const devicePixels = (css: number) => Math.round(css * window.devicePixelRatio);

export const tileSrc = (image: ImageEntry) => imageUrl(image.path, devicePixels(TILE_CSS), image.mtimeMs);
export const previewSrc = (path: string, mtimeMs: number) => imageUrl(path, devicePixels(PREVIEW_CSS), mtimeMs);
export const fullSrc = (path: string, mtimeMs: number, screenWidth: number) =>
  imageUrl(path, devicePixels(screenWidth), mtimeMs);

// A miniature of the main display: the image fills it the way macOS "Fill Screen"
// does, under a menu bar strip and a dock so it reads as a desktop.
export function Desktop({ label, loading = false, children }: { label: string; loading?: boolean; children?: ReactNode }) {
  return (
    <div className={`desktop${loading ? ' skeleton' : ''}`} role="img" aria-label={label} aria-busy={loading}>
      {children}
      <div className="desktop-menubar" aria-hidden="true">
        <span className="menubar-group">
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
        <span className="menubar-group">
          <span />
          <span />
          <span />
        </span>
      </div>
      <div className="desktop-dock" aria-hidden="true" />
    </div>
  );
}

// Stacks sources from smallest to sharpest; each sharper layer fades in over the
// previous one once it has loaded. Key it by image path to reset on selection change.
export function DesktopImage({ sources }: { sources: string[] }) {
  const [failed, setFailed] = useState(false);
  return (
    <>
      {sources.map((src, index) => (
        <Layer
          key={src}
          src={src}
          base={index === 0}
          onFail={index === sources.length - 1 ? () => setFailed(true) : undefined}
        />
      ))}
      {failed && (
        <div className="desktop-message">
          <ImageOff size={20} />
          Can’t preview this image
        </div>
      )}
    </>
  );
}

function Layer({ src, base, onFail }: { src: string; base: boolean; onFail?: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      className={`desktop-img${base || loaded ? ' is-loaded' : ''}`}
      src={src}
      alt=""
      draggable={false}
      onLoad={() => setLoaded(true)}
      onError={onFail}
    />
  );
}

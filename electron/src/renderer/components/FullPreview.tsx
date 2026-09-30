import { useEffect, useRef, type MouseEvent } from 'react';
import { Check, LoaderCircle, X } from 'lucide-react';
import type { ImageEntry } from '../../shared/api';
import { CurrentTag, ErrorBanner, type Busy } from './Actions';
import { Desktop, DesktopImage, fullSrc, previewSrc, tileSrc } from './Desktop';

interface FullPreviewProps {
  image: ImageEntry;
  screenWidth: number;
  isCurrent: boolean;
  busy: Busy;
  justSet: boolean;
  error: string | null;
  onDismissError: () => void;
  onClose: () => void;
}

// Keys (arrows, Return, Space, Escape) are handled by the app-wide handler.
export function FullPreview({ image, screenWidth, isCurrent, busy, justSet, error, onDismissError, onClose }: FullPreviewProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const closeOnBackdrop = (event: MouseEvent) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      ref={ref}
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Full preview of ${image.name}`}
      tabIndex={-1}
      onClick={closeOnBackdrop}
    >
      <button type="button" className="overlay-close" aria-label="Close full preview" title="Close (Esc)" onClick={onClose}>
        <X size={15} strokeWidth={2.5} />
      </button>
      <div className="overlay-stage" onClick={closeOnBackdrop}>
        <Desktop label={`${image.name} as your wallpaper`}>
          <DesktopImage
            key={image.path}
            sources={[tileSrc(image), previewSrc(image.path, image.mtimeMs), fullSrc(image.path, image.mtimeMs, screenWidth)]}
          />
        </Desktop>
      </div>
      <div className="overlay-caption">
        <span className="overlay-name">{image.name}</span>
        {busy === 'set' ? (
          <span className="overlay-status">
            <LoaderCircle size={13} className="spin" />
            Setting…
          </span>
        ) : justSet ? (
          <span className="overlay-status">
            <Check size={13} strokeWidth={2.75} className="pop" />
            Wallpaper set
          </span>
        ) : (
          isCurrent && <CurrentTag />
        )}
      </div>
      <p className="overlay-hint">Arrow keys browse · Return sets · Space or Esc closes</p>
      {error && <ErrorBanner message={error} onDismiss={onDismissError} />}
    </div>
  );
}

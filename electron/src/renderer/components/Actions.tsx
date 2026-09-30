import { Check, LoaderCircle, TriangleAlert, Undo2, X } from 'lucide-react';

export type Busy = 'set' | 'undo' | null;

interface ActionsProps {
  // The file the preview shows: the selection, or the current wallpaper when nothing is selectable.
  file: { path: string; name: string } | null;
  canSet: boolean;
  canUndo: boolean;
  busy: Busy;
  justSet: boolean;
  isCurrent: boolean;
  onSet: () => void;
  onUndo: () => void;
  onReveal: (path: string) => void;
}

export function Actions({ file, canSet, canUndo, busy, justSet, isCurrent, onSet, onUndo, onReveal }: ActionsProps) {
  return (
    <div className="actions">
      <button type="button" className="btn btn-primary" disabled={!canSet} aria-disabled={busy !== null} onClick={onSet}>
        {busy === 'set' ? (
          <>
            <LoaderCircle size={15} className="spin" />
            Setting…
          </>
        ) : justSet ? (
          <>
            <Check size={15} strokeWidth={2.75} className="pop" />
            Wallpaper set
          </>
        ) : (
          'Set as wallpaper'
        )}
      </button>
      <button type="button" className="btn btn-secondary" disabled={!canUndo} aria-disabled={busy !== null} onClick={onUndo}>
        {busy === 'undo' ? <LoaderCircle size={15} className="spin" /> : <Undo2 size={15} />}
        Undo
      </button>
      {file && (
        <div className="file">
          {isCurrent && <CurrentTag />}
          <button
            type="button"
            className="file-name"
            title="Reveal in Finder"
            aria-label={`Reveal ${file.name} in Finder`}
            onClick={() => onReveal(file.path)}
          >
            {file.name}
          </button>
        </div>
      )}
    </div>
  );
}

export function CurrentTag() {
  return (
    <span className="tag">
      <Check size={11} strokeWidth={3} />
      Current wallpaper
    </span>
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="banner" role="alert">
      <TriangleAlert size={15} className="banner-icon" />
      <p className="banner-text selectable">{message}</p>
      <button type="button" className="banner-close" aria-label="Dismiss error" title="Dismiss (Esc)" onClick={onDismiss}>
        <X size={13} strokeWidth={2.5} />
      </button>
    </div>
  );
}

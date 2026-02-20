import React, { useState, useCallback } from 'react';
import type { HistoryEntry } from '../types';

interface LibraryProps {
  history: HistoryEntry[];
  lastAppliedPath: string | null;
  onSelect: (entry: HistoryEntry) => void;
  onImport: () => void;
  onDelete: (id: string) => void;
}

export function Library({ history, lastAppliedPath, onSelect, onImport, onDelete }: LibraryProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => /\.(jpe?g|png|gif|heic|bmp|tiff|webp)$/i.test(f.name));
    if (imageFile) {
      onSelect({
        id: crypto.randomUUID(),
        fileURL: imageFile.path,
        createdAt: new Date().toISOString(),
        source: 'localImage',
        metadata: {},
      });
    }
  }, [onSelect]);

  if (history.length === 0) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-4)',
          padding: 'var(--space-8)',
          position: 'relative',
        }}
      >
        {dragOver && <DropOverlay />}
        <div style={{
          fontSize: '48px',
          opacity: 0.15,
          lineHeight: 1,
        }}>⬡</div>
        <div style={{
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: 'var(--text-base)',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-2)',
          }}>No wallpapers yet</p>
          <p style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-tertiary)',
          }}>Drop images here or import to get started</p>
        </div>
        <button
          onClick={onImport}
          style={{
            padding: 'var(--space-2) var(--space-5)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent)',
            color: 'var(--accent-text)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            cursor: 'pointer',
            transition: `background var(--duration-fast) var(--ease-out)`,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent)'}
        >
          Import Image
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        height: '100%',
        overflow: 'auto',
        padding: 'var(--space-5)',
        position: 'relative',
      }}
    >
      {dragOver && <DropOverlay />}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 'var(--space-4)',
      }}>
        {history.map((entry) => (
          <WallpaperCard
            key={entry.id}
            entry={entry}
            isActive={entry.fileURL === lastAppliedPath}
            onSelect={() => onSelect(entry)}
            onDelete={() => onDelete(entry.id)}
          />
        ))}
      </div>
    </div>
  );
}

function WallpaperCard({ entry, isActive, onSelect, onDelete }: {
  entry: HistoryEntry;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fileName = entry.fileURL.split('/').pop() || 'Untitled';

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        aspectRatio: '16 / 10',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        cursor: 'pointer',
        border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
        transition: `all var(--duration-normal) var(--ease-out)`,
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      }}
    >
      {!imgError ? (
        <img
          src={`file://${entry.fileURL}`}
          alt={fileName}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          loading="lazy"
        />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-surface)',
          color: 'var(--text-tertiary)',
          fontSize: 'var(--text-xs)',
        }}>
          Missing
        </div>
      )}

      {/* Hover overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: hovered
          ? 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)'
          : 'transparent',
        transition: `opacity var(--duration-fast) var(--ease-out)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 'var(--space-3)',
      }}>
        {hovered && (
          <>
            <p style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              color: 'white',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>{fileName}</p>
            <p style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.6)',
              marginTop: '2px',
            }}>
              {new Date(entry.createdAt).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{
                position: 'absolute',
                top: 'var(--space-2)',
                right: 'var(--space-2)',
                width: '24px',
                height: '24px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0,0,0,0.5)',
                color: 'rgba(255,255,255,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                backdropFilter: 'blur(8px)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--destructive)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            >
              ×
            </button>
          </>
        )}
      </div>

      {/* Active indicator */}
      {isActive && (
        <div style={{
          position: 'absolute',
          top: 'var(--space-2)',
          left: 'var(--space-2)',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'var(--success)',
          boxShadow: '0 0 6px var(--success)',
        }} />
      )}
    </div>
  );
}

function DropOverlay() {
  return (
    <div style={{
      position: 'absolute',
      inset: 'var(--space-3)',
      borderRadius: 'var(--radius-xl)',
      border: '2px dashed var(--accent)',
      background: 'var(--accent-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      pointerEvents: 'none',
    }}>
      <span style={{
        fontSize: 'var(--text-base)',
        fontWeight: 500,
        color: 'var(--text-accent)',
      }}>Drop to import</span>
    </div>
  );
}

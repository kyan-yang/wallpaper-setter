import React from 'react';

interface PreviewProps {
  filePath: string;
  isBusy: boolean;
  isApplied: boolean;
  onApply: () => void;
  onDismiss: () => void;
}

export function Preview({ filePath, isBusy, isApplied, onApply, onDismiss }: PreviewProps) {
  const fileName = filePath.split('/').pop() || 'Untitled';

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Preview image */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        overflow: 'hidden',
      }}>
        <img
          src={`local-file://${filePath}`}
          alt={fileName}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
          }}
        />
      </div>

      {/* Bottom bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-5)',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <button
          onClick={onDismiss}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: `background var(--duration-fast) var(--ease-out)`,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          ← Back
        </button>

        <button
          onClick={onApply}
          disabled={isBusy}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-5)',
            borderRadius: 'var(--radius-md)',
            background: isBusy ? 'var(--accent-subtle)' : 'var(--accent)',
            color: isBusy ? 'var(--text-tertiary)' : 'var(--accent-text)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            cursor: isBusy ? 'not-allowed' : 'pointer',
            transition: `all var(--duration-fast) var(--ease-out)`,
            opacity: isBusy ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (!isBusy) e.currentTarget.style.background = 'var(--accent-hover)'; }}
          onMouseLeave={(e) => { if (!isBusy) e.currentTarget.style.background = 'var(--accent)'; }}
        >
          {isBusy ? '⟳ Applying…' : 'Apply'}
        </button>

        {isApplied && (
          <span style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
          }}>
            ✓ Currently applied
          </span>
        )}

        <div style={{ flex: 1 }} />

        <span style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--text-tertiary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '300px',
          direction: 'rtl',
          textAlign: 'left',
        }}>
          {fileName}
        </span>
      </div>
    </div>
  );
}

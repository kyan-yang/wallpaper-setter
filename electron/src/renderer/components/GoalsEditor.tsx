import React, { useCallback, useEffect, useRef } from 'react';
import type { GoalsDraft } from '../types';

interface GoalsEditorProps {
  draft: GoalsDraft;
  previewPath: string | null;
  isBusy: boolean;
  onDraftChange: (draft: GoalsDraft) => void;
  onGenerate: (draft: GoalsDraft) => void;
  onApply: () => void;
}

export function GoalsEditor({ draft, previewPath, isBusy, onDraftChange, onGenerate, onApply }: GoalsEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const updateDraft = useCallback((partial: Partial<GoalsDraft>) => {
    const updated = { ...draft, ...partial };
    onDraftChange(updated);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onGenerate(updated);
    }, 500);
  }, [draft, onDraftChange, onGenerate]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
    }}>
      {/* Preview pane */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-7)',
        overflow: 'hidden',
      }}>
        {previewPath ? (
          <img
            src={`local-file://${previewPath}?t=${Date.now()}`}
            alt="Goals preview"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
            }}
          />
        ) : isBusy ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-3)',
            color: 'var(--text-tertiary)',
          }}>
            <div style={{ fontSize: '20px', animation: 'spin 1s linear infinite' }}>⟳</div>
            <span style={{ fontSize: 'var(--text-sm)' }}>Generating…</span>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-tertiary)',
          }}>
            <div style={{ fontSize: '44px', opacity: 0.3, marginBottom: 'var(--space-3)' }}>◎</div>
            <p style={{ fontSize: 'var(--text-sm)' }}>Preview will appear here</p>
          </div>
        )}
      </div>

      {/* Editor pane */}
      <div style={{
        width: '280px',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-5)',
        gap: 'var(--space-5)',
        overflow: 'auto',
        background: 'var(--bg-surface)',
      }}>
        {/* Title */}
        <div>
          <Label text="Title" />
          <input
            type="text"
            placeholder="My Goals"
            value={draft.title}
            onChange={(e) => updateDraft({ title: e.target.value })}
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              transition: `border-color var(--duration-fast) var(--ease-out)`,
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-focus)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Theme */}
        <div>
          <Label text="Theme" />
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <ThemeChip
              label="Dark"
              color="#1E1E1E"
              isSelected={draft.theme === 'minimalDark'}
              onClick={() => updateDraft({ theme: 'minimalDark' })}
            />
            <ThemeChip
              label="Light"
              color="#EBEBEB"
              isSelected={draft.theme === 'minimalLight'}
              onClick={() => updateDraft({ theme: 'minimalLight' })}
            />
          </div>
        </div>

        {/* Goals */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
            <Label text="Goals" />
            <span style={{
              fontSize: '10px',
              color: 'var(--text-tertiary)',
            }}>One per line</span>
          </div>
          <textarea
            placeholder="Ship the MVP&#10;Exercise daily&#10;Read 30 minutes"
            value={draft.goalsText}
            onChange={(e) => updateDraft({ goalsText: e.target.value })}
            style={{
              flex: 1,
              minHeight: '160px',
              resize: 'none',
              padding: 'var(--space-3)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              lineHeight: 'var(--leading-normal)',
              transition: `border-color var(--duration-fast) var(--ease-out)`,
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-focus)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Apply button */}
        <button
          onClick={onApply}
          disabled={!previewPath || isBusy}
          style={{
            width: '100%',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: (!previewPath || isBusy) ? 'var(--accent-subtle)' : 'var(--accent)',
            color: (!previewPath || isBusy) ? 'var(--text-tertiary)' : 'var(--accent-text)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            cursor: (!previewPath || isBusy) ? 'not-allowed' : 'pointer',
            transition: `all var(--duration-fast) var(--ease-out)`,
          }}
          onMouseEnter={(e) => {
            if (previewPath && !isBusy) e.currentTarget.style.background = 'var(--accent-hover)';
          }}
          onMouseLeave={(e) => {
            if (previewPath && !isBusy) e.currentTarget.style.background = 'var(--accent)';
          }}
        >
          {isBusy ? 'Generating…' : 'Apply as Wallpaper'}
        </button>
      </div>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: 'var(--text-xs)',
      fontWeight: 500,
      color: 'var(--text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: 'var(--space-2)',
    }}>
      {text}
    </div>
  );
}

function ThemeChip({ label, color, isSelected, onClick }: {
  label: string;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-1)',
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: '44px',
        height: '28px',
        borderRadius: 'var(--radius-md)',
        background: color,
        border: isSelected
          ? '2px solid var(--accent)'
          : '1px solid var(--border)',
        transition: `border-color var(--duration-fast) var(--ease-out)`,
      }} />
      <span style={{
        fontSize: '10px',
        color: isSelected ? 'var(--text-primary)' : 'var(--text-tertiary)',
      }}>{label}</span>
    </button>
  );
}

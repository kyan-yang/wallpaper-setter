import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
}

export function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed',
        bottom: 'var(--space-5)',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-2) var(--space-4)',
        borderRadius: 'var(--radius-xl)',
        background: type === 'error'
          ? 'var(--destructive-subtle)'
          : 'var(--success-subtle)',
        border: `1px solid ${type === 'error' ? 'var(--destructive)' : 'var(--success)'}`,
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
        zIndex: 100,
        animation: 'slideUp 200ms var(--ease-out)',
      }}
    >
      <span style={{
        fontSize: '14px',
      }}>
        {type === 'error' ? '⚠' : '✓'}
      </span>
      <span style={{
        fontSize: 'var(--text-sm)',
        fontWeight: 500,
        color: type === 'error' ? 'var(--destructive)' : 'var(--success)',
      }}>
        {message}
      </span>
    </div>
  );
}

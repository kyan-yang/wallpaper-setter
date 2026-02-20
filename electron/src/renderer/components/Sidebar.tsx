import React from 'react';
import type { Tab } from '../types';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onImport: () => void;
  historyCount: number;
  onClearHistory: () => void;
}

export function Sidebar({ activeTab, onTabChange, onImport, historyCount, onClearHistory }: SidebarProps) {
  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      flexShrink: 0,
    }}>
      {/* Drag region for traffic lights */}
      <div className="titlebar-drag" style={{
        height: 'var(--titlebar-height)',
        flexShrink: 0,
      }} />

      {/* Nav */}
      <nav style={{ padding: '0 var(--space-3)', flex: 1 }}>
        <NavItem
          icon="◫"
          label="Library"
          isActive={activeTab === 'library'}
          onClick={() => onTabChange('library')}
        />
        <NavItem
          icon="◉"
          label="Goals"
          isActive={activeTab === 'goals'}
          onClick={() => onTabChange('goals')}
        />
      </nav>

      {/* Bottom actions */}
      <div style={{
        padding: 'var(--space-3)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
      }}>
        <SidebarButton icon="+" label="Import Image" onClick={onImport} />
        {historyCount > 0 && (
          <SidebarButton icon="×" label="Clear History" onClick={onClearHistory} destructive />
        )}
      </div>
    </aside>
  );
}

function NavItem({ icon, label, isActive, onClick }: {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        width: '100%',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--text-sm)',
        fontWeight: isActive ? 500 : 400,
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: isActive
          ? 'var(--bg-surface-hover)'
          : hovered
            ? 'var(--bg-surface)'
            : 'transparent',
        transition: `all var(--duration-fast) var(--ease-out)`,
        cursor: 'pointer',
        marginBottom: '2px',
      }}
    >
      <span style={{ fontSize: '14px', opacity: isActive ? 1 : 0.6 }}>{icon}</span>
      {label}
    </button>
  );
}

function SidebarButton({ icon, label, onClick, destructive }: {
  icon: string;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        width: '100%',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--text-xs)',
        color: destructive
          ? (hovered ? 'var(--destructive)' : 'var(--text-tertiary)')
          : 'var(--text-secondary)',
        background: hovered ? 'var(--bg-surface)' : 'transparent',
        transition: `all var(--duration-fast) var(--ease-out)`,
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: '13px', fontWeight: 500 }}>{icon}</span>
      {label}
    </button>
  );
}

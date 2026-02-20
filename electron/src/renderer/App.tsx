import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Tab, HistoryEntry, GoalsDraft, SidecarError } from './types';
import { Sidebar } from './components/Sidebar';
import { Library } from './components/Library';
import { Preview } from './components/Preview';
import { GoalsEditor } from './components/GoalsEditor';
import { Toast } from './components/Toast';

function isError(result: any): result is SidecarError {
  return result && result.error === true;
}

export function App() {
  const [tab, setTab] = useState<Tab>('library');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [goalsDraft, setGoalsDraft] = useState<GoalsDraft>({
    title: '',
    goalsText: '',
    theme: 'minimalDark',
  });
  const [lastAppliedPath, setLastAppliedPath] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    window.api.bootstrap().then((data) => {
      if (isError(data)) {
        showToast(data.message, 'error');
        return;
      }
      setHistory(data.history);
      setGoalsDraft(data.goalsDraft);
      setLastAppliedPath(data.lastAppliedPath);
      if (data.lastAppliedPath) {
        setSelectedPath(data.lastAppliedPath);
      }
    });
  }, [showToast]);

  const handleImport = useCallback(async () => {
    const filePath = await window.api.openFile();
    if (filePath) {
      setSelectedPath(filePath);
      setPreviewPath(filePath);
      setShowPreview(true);
    }
  }, []);

  const handleSelectEntry = useCallback((entry: HistoryEntry) => {
    setSelectedPath(entry.fileURL);
    setPreviewPath(entry.fileURL);
    setShowPreview(true);
  }, []);

  const handleApply = useCallback(async (filePath: string) => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const result = await window.api.apply(filePath);
      if (isError(result)) {
        showToast(result.message, 'error');
        return;
      }
      setHistory((prev) => [result.entry, ...prev.filter((e) => e.id !== result.entry.id)]);
      setLastAppliedPath(filePath);
      showToast('Wallpaper applied');
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, showToast]);

  const handleGenerateGoals = useCallback(async (draft: GoalsDraft) => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const result = await window.api.generateGoals(JSON.stringify(draft));
      if (isError(result)) {
        showToast(result.message, 'error');
        return;
      }
      setPreviewPath(result.fileURL);
      setSelectedPath(result.fileURL);
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, showToast]);

  const handleApplyGoals = useCallback(async () => {
    if (!previewPath) return;
    await handleApply(previewPath);
  }, [previewPath, handleApply]);

  const handleDeleteEntry = useCallback(async (id: string) => {
    const result = await window.api.deleteHistory(id);
    if (isError(result)) {
      showToast(result.message, 'error');
      return;
    }
    setHistory((prev) => prev.filter((e) => e.id !== id));
    showToast('Removed from history');
  }, [showToast]);

  const handleClearHistory = useCallback(async () => {
    const result = await window.api.clearHistory();
    if (isError(result)) {
      showToast(result.message, 'error');
      return;
    }
    setHistory([]);
    showToast('History cleared');
  }, [showToast]);

  const handleDismissPreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg)',
    }}>
      <Sidebar
        activeTab={tab}
        onTabChange={(t) => { setTab(t); setShowPreview(false); }}
        onImport={handleImport}
        historyCount={history.length}
        onClearHistory={handleClearHistory}
      />
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderLeft: '1px solid var(--border)',
      }}>
        {/* Titlebar drag region */}
        <div className="titlebar-drag" style={{
          height: 'var(--titlebar-height)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'flex-end',
          paddingBottom: 'var(--space-3)',
          paddingLeft: 'var(--space-5)',
          paddingRight: 'var(--space-5)',
        }}>
          <span className="titlebar-no-drag" style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-tertiary)',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            fontWeight: 500,
          }}>
            {showPreview ? 'Preview' : tab === 'library' ? 'Library' : 'Goals'}
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {showPreview && previewPath ? (
            <Preview
              filePath={previewPath}
              isBusy={isBusy}
              isApplied={previewPath === lastAppliedPath}
              onApply={() => handleApply(previewPath)}
              onDismiss={handleDismissPreview}
            />
          ) : tab === 'library' ? (
            <Library
              history={history}
              lastAppliedPath={lastAppliedPath}
              onSelect={handleSelectEntry}
              onImport={handleImport}
              onDelete={handleDeleteEntry}
            />
          ) : (
            <GoalsEditor
              draft={goalsDraft}
              previewPath={previewPath}
              isBusy={isBusy}
              onDraftChange={setGoalsDraft}
              onGenerate={handleGenerateGoals}
              onApply={handleApplyGoals}
            />
          )}
        </div>
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

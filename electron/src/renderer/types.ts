export interface HistoryEntry {
  id: string;
  fileURL: string;
  createdAt: string;
  source: 'localImage' | 'generatedGoals';
  metadata: Record<string, string>;
}

export interface GoalsDraft {
  title: string;
  goalsText: string;
  theme: 'minimalDark' | 'minimalLight';
}

export interface BootstrapData {
  history: HistoryEntry[];
  goalsDraft: GoalsDraft;
  lastAppliedPath: string | null;
}

export interface ApplyResult {
  success: boolean;
  message: string;
  entry: HistoryEntry;
}

export interface GenerateResult {
  success: boolean;
  fileURL: string;
  width: number;
  height: number;
}

export interface ScreenInfo {
  width: number;
  height: number;
}

export interface AppError {
  error: true;
  code: string;
  message: string;
  suggestion: string;
}

export type Tab = 'library' | 'goals';

declare global {
  interface Window {
    api: {
      bootstrap: () => Promise<BootstrapData | AppError>;
      apply: (filePath: string) => Promise<ApplyResult | AppError>;
      saveRenderedImage: (imageData: Uint8Array) => Promise<GenerateResult | AppError>;
      saveDraft: (json: string) => Promise<{ success: boolean } | AppError>;
      deleteHistory: (id: string) => Promise<{ success: boolean } | AppError>;
      clearHistory: () => Promise<{ success: boolean } | AppError>;
      screenInfo: () => Promise<ScreenInfo>;
      openFile: () => Promise<string | null>;
      showInFinder: (filePath: string) => Promise<void>;
    };
  }
}

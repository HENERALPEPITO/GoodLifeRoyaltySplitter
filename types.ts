export interface RawCsvRow {
  [key: string]: string | number | boolean | null;
}

export interface ProcessedComposerData {
  composerName: string;
  filename: string;
  rows: RawCsvRow[];
  rowCount: number;
}

export interface ProcessingStats {
  totalRows: number;
  totalComposers: number;
  processingTimeMs: number;
}

export type AppState = 'IDLE' | 'COLUMN_SELECTION' | 'PROCESSING' | 'COMPLETED';
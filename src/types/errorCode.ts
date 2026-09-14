export interface ErrorRecord {
  id: string;
  errorCode: string;
  normalizedCode: string;
  microservice: string;
  description: string;
  sourceSheet?: string;
  sourceRow?: number;
  metadata?: {
    scenario?: string;
    uiMessage?: string;
    logMessage?: string;
    remarks?: string;
    messageType?: string;
    prefix?: string;
    [key: string]: any;
  };
}

export interface ColumnMapping {
  errorCodeCol: string;
  microserviceCol: string;
  descriptionCol: string;
  scenarioCol?: string;
  uiMessageCol?: string;
  logMessageCol?: string;
}

export interface DetectedColumns {
  errorCodeCols: string[];
  microserviceCols: string[];
  descriptionCols: string[];
  allHeaders: string[];
  detectedHeaderRowIndex: number;
  bestMapping: ColumnMapping;
  isConfident: boolean;
}

export interface SheetInfo {
  name: string;
  rowCount: number;
  hasHeaders: boolean;
  detectedColumns: DetectedColumns;
}

export interface DatasetMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  totalRecords: number;
  uniqueErrorCodes: number;
  uniqueMicroservices: number;
  microserviceDistribution: Record<string, number>;
  sheetNames: string[];
  selectedSheet: string; // 'all' or specific sheet name
}

export type SearchMode = 'exact' | 'partial';

export interface SearchMatch {
  record: ErrorRecord;
  matchType: 'exact' | 'prefix' | 'substring' | 'fuzzy';
  score?: number;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  matchedCount: number;
  sampleMicroservice?: string;
}

export interface ParseProgress {
  stage: 'reading' | 'detecting' | 'normalizing' | 'indexing' | 'saving' | 'ready';
  message: string;
  percentage: number;
}

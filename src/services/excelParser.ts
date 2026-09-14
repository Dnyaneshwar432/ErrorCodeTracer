import * as XLSX from 'xlsx';
import { ColumnMapping, DetectedColumns, SheetInfo } from '../types/errorCode';

export interface RawRowData {
  [key: string]: any;
}

export interface ParsedSheetData {
  sheetName: string;
  headers: string[];
  headerRowIndex: number;
  rows: RawRowData[];
  detectedColumns: DetectedColumns;
}

export interface ParseResult {
  workbook: XLSX.WorkBook;
  sheetNames: string[];
  sheetsData: Map<string, ParsedSheetData>;
}

const ERROR_CODE_KEYWORDS = [
  'error code',
  'error codes',
  'error_code',
  'error_codes',
  'errorcode',
  'err code',
  'err_code',
  'code',
  'error id',
  'error_id',
  'ctms error_code'
];

const MICROSERVICE_KEYWORDS = [
  'microservice',
  'micro service',
  'service',
  'ms',
  'prefix',
  'module',
  'component',
  'system',
  'service name'
];

const DESCRIPTION_KEYWORDS = [
  'message content - text',
  'message content',
  'error description',
  'description',
  'error message',
  'message',
  'desc',
  'enum /message content - text',
  'updated error messages',
  'api back-end message',
  'application logs message',
  'ui message',
  'ui_message'
];

const SCENARIO_KEYWORDS = ['scenario', 'condition', 'trigger', 'use case'];
const UI_MESSAGE_KEYWORDS = ['ui message', 'ui_message', 'ui_msg', 'user message', 'display message'];
const LOG_MESSAGE_KEYWORDS = [
  'application logs message',
  'application_logs_error_message',
  'api back-end message',
  'log message',
  'logs'
];
const REMARKS_KEYWORDS = ['remarks', 'notes', 'comment', 'comments'];
const MESSAGE_TYPE_KEYWORDS = ['message type', 'type', 'severity', 'error type'];

/**
 * Normalizes a string for fuzzy column keyword matching
 */
function cleanColName(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .toLowerCase()
    .replace(/[_\-–—/]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detects the header row and maps columns in a 2D sheet array
 */
export function detectColumnsFromGrid(grid: any[][]): DetectedColumns {
  if (!grid || grid.length === 0) {
    return {
      errorCodeCols: [],
      microserviceCols: [],
      descriptionCols: [],
      allHeaders: [],
      detectedHeaderRowIndex: 0,
      bestMapping: { errorCodeCol: '', microserviceCol: '', descriptionCol: '' },
      isConfident: false
    };
  }

  const maxRowsToScan = Math.min(12, grid.length);
  let bestRowIndex = 0;
  let bestScore = -1;
  let bestHeaders: string[] = [];

  for (let r = 0; r < maxRowsToScan; r++) {
    const row = grid[r];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    // Filter non-empty cells
    const nonEmpties = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (nonEmpties.length === 0) continue;

    let score = 0;
    const cleanedCells = row.map((c) => cleanColName(c));

    cleanedCells.forEach((cell) => {
      if (!cell) return;
      if (ERROR_CODE_KEYWORDS.some((kw) => cell === kw || cell.includes(kw))) score += 4;
      if (MICROSERVICE_KEYWORDS.some((kw) => cell === kw || cell.includes(kw))) score += 3;
      if (DESCRIPTION_KEYWORDS.some((kw) => cell === kw || cell.includes(kw))) score += 3;
      if (SCENARIO_KEYWORDS.some((kw) => cell.includes(kw))) score += 1;
      if (REMARKS_KEYWORDS.some((kw) => cell.includes(kw))) score += 1;
    });

    if (score > bestScore) {
      bestScore = score;
      bestRowIndex = r;
      bestHeaders = row.map((c, i) => (c !== null && c !== undefined && String(c).trim() !== '' ? String(c).trim() : `Column_${i + 1}`));
    }
  }

  // If no good header row was found, default to first row with content
  if (bestHeaders.length === 0) {
    bestHeaders = (grid[0] || []).map((c, i) => (c !== null && c !== undefined && String(c).trim() !== '' ? String(c).trim() : `Column_${i + 1}`));
  }

  // Classify each column
  const errorCodeCols: string[] = [];
  const microserviceCols: string[] = [];
  const descriptionCols: string[] = [];
  let scenarioCol = '';
  let uiMessageCol = '';
  let logMessageCol = '';

  bestHeaders.forEach((rawCol) => {
    const clean = cleanColName(rawCol);
    if (!clean) return;

    if (ERROR_CODE_KEYWORDS.some((kw) => clean === kw || clean.includes(kw))) {
      errorCodeCols.push(rawCol);
    }
    if (MICROSERVICE_KEYWORDS.some((kw) => clean === kw || clean.includes(kw))) {
      microserviceCols.push(rawCol);
    }
    if (DESCRIPTION_KEYWORDS.some((kw) => clean === kw || clean.includes(kw))) {
      descriptionCols.push(rawCol);
    }
    if (!scenarioCol && SCENARIO_KEYWORDS.some((kw) => clean.includes(kw))) {
      scenarioCol = rawCol;
    }
    if (!uiMessageCol && UI_MESSAGE_KEYWORDS.some((kw) => clean.includes(kw))) {
      uiMessageCol = rawCol;
    }
    if (!logMessageCol && LOG_MESSAGE_KEYWORDS.some((kw) => clean.includes(kw))) {
      logMessageCol = rawCol;
    }
  });

  // Pick best default candidate for each
  const bestErrorCodeCol =
    errorCodeCols.find((c) => cleanColName(c) === 'error code' || cleanColName(c) === 'error codes' || cleanColName(c) === 'error_code') ||
    errorCodeCols[0] ||
    '';

  const bestMicroserviceCol =
    microserviceCols.find((c) => cleanColName(c) === 'microservice' || cleanColName(c) === 'ms' || cleanColName(c) === 'prefix') ||
    microserviceCols[0] ||
    '';

  const bestDescriptionCol =
    descriptionCols.find((c) => cleanColName(c) === 'message content text' || cleanColName(c) === 'error description' || cleanColName(c) === 'description') ||
    descriptionCols[0] ||
    '';

  const isConfident = Boolean(bestErrorCodeCol && (bestDescriptionCol || descriptionCols.length > 0));

  return {
    errorCodeCols,
    microserviceCols,
    descriptionCols,
    allHeaders: bestHeaders,
    detectedHeaderRowIndex: bestRowIndex,
    bestMapping: {
      errorCodeCol: bestErrorCodeCol,
      microserviceCol: bestMicroserviceCol,
      descriptionCol: bestDescriptionCol,
      scenarioCol,
      uiMessageCol,
      logMessageCol
    },
    isConfident
  };
}

/**
 * Parses an Excel or CSV file buffer into sheets and detected columns
 */
export function readWorkbook(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellFormula: false,
    cellHTML: false,
    raw: true
  });

  const sheetsData = new Map<string, ParsedSheetData>();

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    // Convert sheet to 2D array of rows
    const grid = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false
    }) as any[][];

    if (!grid || grid.length === 0) return;

    const detected = detectColumnsFromGrid(grid);
    const headerRow = detected.detectedHeaderRowIndex;

    // Convert data rows starting after headerRow
    const headers = detected.allHeaders;
    const rawRows: RawRowData[] = [];

    for (let r = headerRow + 1; r < grid.length; r++) {
      const rowArr = grid[r];
      if (!rowArr || !Array.isArray(rowArr)) continue;

      const rowObj: RawRowData = {};
      let hasAnyValue = false;

      headers.forEach((h, colIdx) => {
        const val = rowArr[colIdx];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          rowObj[h] = val;
          hasAnyValue = true;
        } else {
          rowObj[h] = '';
        }
      });

      if (hasAnyValue) {
        // Also record 1-based source row index
        rowObj.__sourceRow = r + 1;
        rawRows.push(rowObj);
      }
    }

    sheetsData.set(sheetName, {
      sheetName,
      headers,
      headerRowIndex: headerRow,
      rows: rawRows,
      detectedColumns: detected
    });
  });

  return {
    workbook,
    sheetNames: workbook.SheetNames,
    sheetsData
  };
}

/**
 * Summarizes sheet metadata for the multi-sheet selector
 */
export function getSheetSummaries(parseResult: ParseResult): SheetInfo[] {
  return parseResult.sheetNames.map((name) => {
    const data = parseResult.sheetsData.get(name);
    return {
      name,
      rowCount: data ? data.rows.length : 0,
      hasHeaders: Boolean(data && data.headers.length > 0),
      detectedColumns: data
        ? data.detectedColumns
        : {
            errorCodeCols: [],
            microserviceCols: [],
            descriptionCols: [],
            allHeaders: [],
            detectedHeaderRowIndex: 0,
            bestMapping: { errorCodeCol: '', microserviceCol: '', descriptionCol: '' },
            isConfident: false
          }
    };
  });
}

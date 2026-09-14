import { ColumnMapping, ErrorRecord } from '../types/errorCode';
import { ParsedSheetData } from './excelParser';

export function normalizeString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Standardizes an error code for indexing:
 * - Trims whitespace
 * - Converts to uppercase
 * - Collapses internal whitespace
 */
export function normalizeErrorCode(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Normalizes rows from a parsed sheet into standard ErrorRecord items
 */
export function normalizeSheetRows(
  sheetData: ParsedSheetData,
  mapping: ColumnMapping,
  defaultMicroservice?: string
): ErrorRecord[] {
  const records: ErrorRecord[] = [];
  const { sheetName, rows } = sheetData;

  rows.forEach((row, idx) => {
    const rawCode = row[mapping.errorCodeCol];
    const normalizedCode = normalizeErrorCode(rawCode);

    // Skip rows where the error code is empty
    if (!normalizedCode) return;

    // Microservice resolution:
    // 1. Column mapped microservice
    // 2. Default microservice passed (e.g. Sheet name)
    // 3. Fallback "Microservice not specified"
    let rawMs = mapping.microserviceCol ? normalizeString(row[mapping.microserviceCol]) : '';
    if (!rawMs && defaultMicroservice) {
      rawMs = defaultMicroservice;
    }
    const microservice = rawMs || 'Microservice not specified';

    // Description resolution:
    const rawDesc = mapping.descriptionCol ? normalizeString(row[mapping.descriptionCol]) : '';
    const description = rawDesc || 'Description not available';

    // Extract rich context metadata if present
    const scenario = mapping.scenarioCol ? normalizeString(row[mapping.scenarioCol]) : undefined;
    const uiMessage = mapping.uiMessageCol ? normalizeString(row[mapping.uiMessageCol]) : undefined;
    const logMessage = mapping.logMessageCol ? normalizeString(row[mapping.logMessageCol]) : undefined;

    // Check other common metadata fields
    const remarks = normalizeString(row['Remarks'] || row['remarks'] || row['Notes'] || row['notes']) || undefined;
    const messageType = normalizeString(row['Message Type'] || row['message_type'] || row['Type']) || undefined;
    const prefix = normalizeString(row['Prefix'] || row['PREFIX'] || row['prefix']) || undefined;

    records.push({
      id: `${sheetName.replace(/\s+/g, '_')}_${row.__sourceRow || idx + 1}_${idx}`,
      errorCode: normalizeString(rawCode),
      normalizedCode,
      microservice,
      description,
      sourceSheet: sheetName,
      sourceRow: row.__sourceRow || idx + 1,
      metadata: {
        scenario,
        uiMessage,
        logMessage,
        remarks,
        messageType,
        prefix
      }
    });
  });

  return records;
}

/**
 * Combines and normalizes records across multiple sheets
 */
export function normalizeMultipleSheets(
  sheets: ParsedSheetData[],
  customMappings?: Record<string, ColumnMapping>
): ErrorRecord[] {
  const allRecords: ErrorRecord[] = [];

  sheets.forEach((sheet) => {
    // If user provided a mapping for this sheet, use it; otherwise use sheet's detected best mapping
    const mapping = (customMappings && customMappings[sheet.sheetName]) || sheet.detectedColumns.bestMapping;

    // If sheet has no error code column detected, skip or check if a generic column exists
    if (!mapping.errorCodeCol) return;

    // If microservice column is not present or empty, use sheet name as the microservice default
    const records = normalizeSheetRows(sheet, mapping, sheet.sheetName);
    allRecords.push(...records);
  });

  return allRecords;
}

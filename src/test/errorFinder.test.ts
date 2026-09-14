import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  detectColumnsFromGrid,
  readWorkbook,
  getSheetSummaries
} from '../services/excelParser';
import {
  normalizeErrorCode,
  normalizeString,
  normalizeSheetRows,
  normalizeMultipleSheets
} from '../services/dataNormalizer';
import { ErrorIndex } from '../services/errorIndexer';
import { ErrorRecord } from '../types/errorCode';

describe('1. Data Normalizer & Helper Functions', () => {
  it('normalizes error codes with trimming and uppercase', () => {
    expect(normalizeErrorCode('  err_12345  ')).toBe('ERR_12345');
    expect(normalizeErrorCode('lds0001')).toBe('LDS0001');
    expect(normalizeErrorCode('   loscore  00001 ')).toBe('LOSCORE 00001');
    expect(normalizeErrorCode(null)).toBe('');
    expect(normalizeErrorCode(undefined)).toBe('');
    expect(normalizeErrorCode(404)).toBe('404');
  });

  it('normalizes general strings safely', () => {
    expect(normalizeString('  Customer not found  ')).toBe('Customer not found');
    expect(normalizeString(null)).toBe('');
    expect(normalizeString(undefined)).toBe('');
  });
});

describe('2. Column Detection & Header Scanning', () => {
  it('detects header on row 0 correctly', () => {
    const grid = [
      ['Prefix', 'Sr No.', 'Message Content - Text', 'Remarks', 'Error Codes', 'ui_message'],
      ['LDS', '1', 'Lead not found', '', 'LDS0001', 'An error occurred']
    ];

    const detected = detectColumnsFromGrid(grid);
    expect(detected.detectedHeaderRowIndex).toBe(0);
    expect(detected.isConfident).toBe(true);
    expect(detected.bestMapping.errorCodeCol).toBe('Error Codes');
    expect(detected.bestMapping.descriptionCol).toBe('Message Content - Text');
    expect(detected.bestMapping.microserviceCol).toBe('Prefix');
  });

  it('detects header starting on row 1 (e.g. LOS Core cDX where row 0 has title/url)', () => {
    const grid = [
      ['https://docs.google.com/spreadsheets/d/12345', '', '', ''],
      ['Error Code', 'ENUM /Message Content - Text', 'API Back-end Message', 'UI MESSAGE'],
      ['LOSCORE00001', 'DEAL_NOT_FOUND', 'Deal not found for given id {0}', 'Deal not found']
    ];

    const detected = detectColumnsFromGrid(grid);
    expect(detected.detectedHeaderRowIndex).toBe(1);
    expect(detected.isConfident).toBe(true);
    expect(detected.bestMapping.errorCodeCol).toBe('Error Code');
    expect(detected.bestMapping.descriptionCol).toBe('ENUM /Message Content - Text');
  });
});

describe('3. Multi-Sheet & Normalization Flow', () => {
  it('correctly handles duplicate error codes across different microservices', () => {
    const sampleRecords: ErrorRecord[] = [
      {
        id: '1',
        errorCode: 'ERR_001',
        normalizedCode: 'ERR_001',
        microservice: 'LMS',
        description: 'Customer details unavailable'
      },
      {
        id: '2',
        errorCode: 'ERR_001',
        normalizedCode: 'ERR_001',
        microservice: 'Account Service',
        description: 'Account lookup failed'
      },
      {
        id: '3',
        errorCode: 'ERR_001',
        normalizedCode: 'ERR_001',
        microservice: 'Caseflow',
        description: 'Case creation failed'
      }
    ];

    const index = new ErrorIndex(sampleRecords);
    const result = index.search('ERR_001', { mode: 'exact' });

    expect(result.matches.length).toBe(3);
    expect(result.matches[0].record.microservice).toBe('LMS');
    expect(result.matches[1].record.microservice).toBe('Account Service');
    expect(result.matches[2].record.microservice).toBe('Caseflow');
  });

  it('filters duplicate error codes by microservice when filter is specified', () => {
    const sampleRecords: ErrorRecord[] = [
      {
        id: '1',
        errorCode: 'ERR_001',
        normalizedCode: 'ERR_001',
        microservice: 'LMS',
        description: 'Customer details unavailable'
      },
      {
        id: '2',
        errorCode: 'ERR_001',
        normalizedCode: 'ERR_001',
        microservice: 'Caseflow',
        description: 'Case creation failed'
      }
    ];

    const index = new ErrorIndex(sampleRecords);
    const result = index.search('ERR_001', { mode: 'exact', microservice: 'Caseflow' });

    expect(result.matches.length).toBe(1);
    expect(result.matches[0].record.microservice).toBe('Caseflow');
    expect(result.matches[0].record.description).toBe('Case creation failed');
  });
});

describe('4. Search Modes & Fuzzy Matching', () => {
  const dataset: ErrorRecord[] = [
    {
      id: '1',
      errorCode: 'ERR_12345',
      normalizedCode: 'ERR_12345',
      microservice: 'LMS',
      description: 'Customer account details could not be retrieved'
    },
    {
      id: '2',
      errorCode: 'ERR_12001',
      normalizedCode: 'ERR_12001',
      microservice: 'LMS',
      description: 'Timeout during auth'
    },
    {
      id: '3',
      errorCode: 'CMS0001',
      normalizedCode: 'CMS0001',
      microservice: 'CMS',
      description: 'Valuation amount is missing or invalid'
    },
    {
      id: '4',
      errorCode: 'CMS0002',
      normalizedCode: 'CMS0002',
      microservice: 'CMS',
      description: 'Valuation rating can only be - Fair, Good, Excellent'
    }
  ];

  const index = new ErrorIndex(dataset);

  it('performs case-insensitive exact search with whitespace trimming', () => {
    const result = index.search('   err_12345   ', { mode: 'exact' });
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].record.errorCode).toBe('ERR_12345');
    expect(result.isExact).toBe(true);
  });

  it('performs partial / substring search', () => {
    const result = index.search('12345', { mode: 'partial' });
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].record.errorCode).toBe('ERR_12345');

    const result2 = index.search('CMS', { mode: 'partial' });
    expect(result2.matches.length).toBe(2);
  });

  it('provides autocomplete suggestions matching prefix', () => {
    const suggestions = index.getAutocomplete('ERR_12');
    expect(suggestions).toContain('ERR_12001');
    expect(suggestions).toContain('ERR_12345');
  });

  it('returns smart fuzzy suggestion when error code has a typo (Did you mean...?)', () => {
    // User typed ERR_1234 instead of ERR_12345
    const result = index.search('ERR_1234', { mode: 'exact' });
    expect(result.matches.length).toBe(0);
    expect(result.suggestions).toContain('ERR_12345');
  });

  it('computes dataset statistics and distribution accurately', () => {
    const meta = index.getMetadata();
    expect(meta?.totalRecords).toBe(4);
    expect(meta?.uniqueErrorCodes).toBe(4);
    expect(meta?.uniqueMicroservices).toBe(2);
    expect(meta?.microserviceDistribution['LMS']).toBe(2);
    expect(meta?.microserviceDistribution['CMS']).toBe(2);
  });
});

describe('5. Real Workbook Synthetic Parsing', () => {
  it('reads in-memory generated workbook and builds searchable index', () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Error Code', 'Microservice', 'Description'],
      ['AUTH_001', 'Auth Service', 'Token expired'],
      ['PAY_999', 'Payment Gateway', 'Card declined'],
      ['', 'Auth Service', 'Empty code row should be ignored']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Errors');

    const wbArray = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const parseResult = readWorkbook(wbArray);

    expect(parseResult.sheetNames).toContain('Errors');
    const sheetData = parseResult.sheetsData.get('Errors')!;
    expect(sheetData.rows.length).toBe(3);

    const records = normalizeSheetRows(sheetData, sheetData.detectedColumns.bestMapping);
    // Row with empty code should be excluded
    expect(records.length).toBe(2);

    const idx = new ErrorIndex(records);
    const searchRes = idx.search('PAY_999');
    expect(searchRes.matches.length).toBe(1);
    expect(searchRes.matches[0].record.description).toBe('Card declined');
  });
});

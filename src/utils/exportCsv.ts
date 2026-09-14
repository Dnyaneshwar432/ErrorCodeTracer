import { ErrorRecord } from '../types/errorCode';

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportRecordsToCsv(records: ErrorRecord[], filename = 'error_code_results.csv'): void {
  if (!records || records.length === 0) return;

  const headers = [
    'Error Code',
    'Microservice',
    'Description',
    'Scenario',
    'UI Message',
    'Application Log Message',
    'Source Sheet',
    'Source Row'
  ];

  const rows: string[] = [headers.map(escapeCsvCell).join(',')];

  records.forEach((rec) => {
    const row = [
      rec.errorCode,
      rec.microservice,
      rec.description,
      rec.metadata?.scenario || '',
      rec.metadata?.uiMessage || '',
      rec.metadata?.logMessage || '',
      rec.sourceSheet || '',
      rec.sourceRow || ''
    ];
    rows.push(row.map(escapeCsvCell).join(','));
  });

  const csvContent = '\uFEFF' + rows.join('\r\n'); // Add BOM for Excel UTF-8
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

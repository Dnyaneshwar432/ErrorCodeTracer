import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Lock, AlertCircle, CheckCircle2, Layers } from 'lucide-react';
import { ParseProgress, SheetInfo } from '../types/errorCode';

interface FileUploaderProps {
  isOpen: boolean;
  onClose?: () => void;
  onProcessFile: (file: File, selectedSheet?: string) => Promise<void>;
  progress: ParseProgress | null;
  sheetChoices: SheetInfo[] | null;
  onSelectSheetChoice: (sheetName: string) => void;
  onCancelSheetChoice: () => void;
  isModal?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  isOpen,
  onClose,
  onProcessFile,
  progress,
  sheetChoices,
  onSelectSheetChoice,
  onCancelSheetChoice,
  isModal = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen && isModal) return null;

  const validateAndHandleFile = (file: File) => {
    setFileError(null);
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isValid) {
      setFileError('Unsupported file format. Please upload an XLSX, XLS, or CSV file.');
      return;
    }

    onProcessFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndHandleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndHandleFile(e.target.files[0]);
    }
  };

  // Sheet Selection Dialog
  if (sheetChoices && sheetChoices.length > 1) {
    return (
      <div className="modal-backdrop">
        <div className="modal-card" style={{ maxWidth: '640px' }}>
          <div className="modal-header">
            <div>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} color="var(--accent-cyan)" />
                Multiple Sheets Detected
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                This workbook has {sheetChoices.length} sheets. Choose which sheet to index:
              </p>
            </div>
          </div>

          <div className="modal-body" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
            {/* Option 1: Process All Sheets */}
            <div
              onClick={() => onSelectSheetChoice('all')}
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(99, 102, 241, 0.12))',
                border: '1px solid rgba(6, 182, 212, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                cursor: 'pointer',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              id="sheet-select-all-btn"
            >
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  ★ Process All Sheets (Recommended)
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Extract error codes across all sheets. Microservices are mapped by Prefix or Sheet name.
                </div>
              </div>
              <button className="btn btn-primary btn-sm">Select All</button>
            </div>

            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Or Select An Individual Sheet:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {sheetChoices.map((s) => (
                <div
                  key={s.name}
                  onClick={() => onSelectSheetChoice(s.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                  className="sheet-item-row"
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {s.name}
                    </span>
                    {s.detectedColumns.bestMapping.errorCodeCol && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginLeft: '0.6rem' }}>
                        (Code: {s.detectedColumns.bestMapping.errorCodeCol})
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {s.rowCount.toLocaleString()} rows
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary btn-sm" onClick={onCancelSheetChoice}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const content = (
    <div>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        id="file-upload-input"
      />

      {/* Progress State */}
      {progress && progress.stage !== 'ready' ? (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem 1.5rem',
            textAlign: 'center'
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {progress.message}
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress.percentage}%` }} />
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Processing local file in browser memory...
          </div>
        </div>
      ) : (
        /* Dropzone */
        <div
          className={`dropzone ${isDragOver ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          id="dropzone-area"
        >
          <div className="dropzone-icon">
            <UploadCloud size={42} />
          </div>
          <div className="dropzone-text-bold">Upload Error Code Sheet</div>
          <div className="dropzone-text-sub">Drag and drop your file here, or click to browse</div>

          <div className="format-tags">
            <span className="format-tag">.XLSX</span>
            <span className="format-tag">.XLS</span>
            <span className="format-tag">.CSV</span>
          </div>
        </div>
      )}

      {/* Error display */}
      {fileError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--accent-rose)',
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginTop: '1rem',
            fontSize: '0.85rem'
          }}
        >
          <AlertCircle size={16} />
          <span>{fileError}</span>
        </div>
      )}

      {/* Privacy note */}
      <div className="privacy-badge">
        <Lock size={13} />
        <span>Your uploaded file is processed 100% locally in your browser. No data leaves your machine.</span>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Upload / Replace Dataset</h3>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="modal-body">{content}</div>
        </div>
      </div>
    );
  }

  return content;
};

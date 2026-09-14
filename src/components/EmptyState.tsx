import React from 'react';
import { Terminal, FileSpreadsheet, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { FileUploader } from './FileUploader';
import { ParseProgress, SheetInfo } from '../types/errorCode';

interface EmptyStateProps {
  onProcessFile: (file: File, selectedSheet?: string) => Promise<void>;
  onLoadSample: () => void;
  isLoadingSample: boolean;
  progress: ParseProgress | null;
  sheetChoices: SheetInfo[] | null;
  onSelectSheetChoice: (sheetName: string) => void;
  onCancelSheetChoice: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onProcessFile,
  onLoadSample,
  isLoadingSample,
  progress,
  sheetChoices,
  onSelectSheetChoice,
  onCancelSheetChoice
}) => {
  return (
    <div className="container empty-state-wrapper">
      <div className="empty-state-hero">
        <div className="empty-hero-icon">
          <Terminal size={38} />
        </div>
        <h1 className="empty-title">MS Error Code Finder</h1>
        <p className="empty-desc">
          Eliminate Excel sheet searching. Upload your microservice error code workbook once,
          then instantly look up descriptions, services, and diagnostic logs.
        </p>
      </div>

      {/* Quick-Start: Preloaded Workspace Sample Dataset */}
      <div className="sample-loader-card" id="sample-dataset-card">
        <div>
          <div className="sample-info-title">
            <Sparkles size={16} color="var(--accent-cyan)" />
            <span>Ready-to-Use Dataset Available</span>
          </div>
          <p className="sample-info-sub">
            &quot;GnG 8.0 Error Messages Review.xlsx&quot; with 31 microservice sheets (~25,000+ records)
            is ready in your workspace.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={onLoadSample}
          disabled={isLoadingSample}
          id="empty-load-sample-btn"
        >
          <FileSpreadsheet size={16} />
          <span>{isLoadingSample ? 'Processing GnG 8.0...' : 'Load GnG 8.0 Dataset'}</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '1.75rem 0',
          color: 'var(--text-muted)',
          fontSize: '0.82rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        <span style={{ height: '1px', flex: 1, background: 'var(--border-subtle)', marginRight: '1rem' }} />
        Or Upload Your Own Sheet
        <span style={{ height: '1px', flex: 1, background: 'var(--border-subtle)', marginLeft: '1rem' }} />
      </div>

      {/* Main File Dropzone */}
      <FileUploader
        isOpen={true}
        onProcessFile={onProcessFile}
        progress={progress}
        sheetChoices={sheetChoices}
        onSelectSheetChoice={onSelectSheetChoice}
        onCancelSheetChoice={onCancelSheetChoice}
        isModal={false}
      />
    </div>
  );
};

import React from 'react';
import { Terminal, Sun, Moon, Upload, Trash2, Database, HelpCircle, FileSpreadsheet } from 'lucide-react';
import { DatasetMetadata } from '../types/errorCode';

interface NavbarProps {
  metadata: DatasetMetadata | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenUpload: () => void;
  onLoadSample: () => void;
  onClearData: () => void;
  onOpenHelp: () => void;
  isLoadingSample?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  metadata,
  theme,
  onToggleTheme,
  onOpenUpload,
  onLoadSample,
  onClearData,
  onOpenHelp,
  isLoadingSample = false
}) => {
  return (
    <header className="app-navbar">
      <div className="container navbar-inner">
        {/* Brand */}
        <div className="brand-badge">
          <div className="brand-icon">
            <Terminal size={20} />
          </div>
          <div className="brand-title">
            <span className="brand-name">MS Error Code Finder</span>
            <span className="brand-tag">Internal Dev Utility</span>
          </div>
        </div>

        {/* Center / Right status & actions */}
        <div className="nav-actions">
          {metadata ? (
            <>
              {/* Ready status pill */}
              <div className="status-pill ready" title={`Dataset: ${metadata.fileName}`}>
                <span className="status-dot pulsing" />
                <span>
                  {metadata.fileName.length > 20
                    ? metadata.fileName.substring(0, 18) + '...'
                    : metadata.fileName}
                </span>
                <span style={{ opacity: 0.65 }}>•</span>
                <span>{metadata.totalRecords.toLocaleString()} records</span>
              </div>

              {/* Replace file button */}
              <button
                className="btn btn-secondary btn-sm"
                onClick={onOpenUpload}
                title="Upload a newer Excel file"
                id="replace-file-btn"
              >
                <Upload size={14} />
                <span>Replace File</span>
              </button>

              {/* Clear dataset */}
              <button
                className="btn btn-ghost btn-sm"
                onClick={onClearData}
                title="Clear current dataset"
                id="clear-data-btn"
                style={{ color: 'var(--accent-rose)' }}
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            </>
          ) : (
            <>
              {/* Empty status pill */}
              <div className="status-pill empty">
                <span className="status-dot" />
                <span>No Dataset Loaded</span>
              </div>

              {/* Quick load sample button */}
              <button
                className="btn btn-secondary btn-sm"
                onClick={onLoadSample}
                disabled={isLoadingSample}
                title="Load the workspace GnG 8.0 dataset immediately"
                id="nav-load-sample-btn"
              >
                <FileSpreadsheet size={14} />
                <span>{isLoadingSample ? 'Loading GnG 8.0...' : 'Load GnG 8.0 Sample'}</span>
              </button>
            </>
          )}

          {/* Help shortcuts */}
          <button
            className="btn btn-icon"
            onClick={onOpenHelp}
            title="Keyboard shortcuts"
            aria-label="Keyboard shortcuts"
          >
            <HelpCircle size={16} />
          </button>

          {/* Theme Toggle */}
          <button
            className="btn btn-icon"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
            id="theme-toggle-btn"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </header>
  );
};

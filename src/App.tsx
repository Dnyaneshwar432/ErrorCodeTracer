import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Navbar } from './components/Navbar';
import { SearchBar } from './components/SearchBar';
import { SearchResults } from './components/SearchResults';
import { RecentSearches } from './components/RecentSearches';
import { DatasetStats } from './components/DatasetStats';
import { EmptyState } from './components/EmptyState';
import { FileUploader } from './components/FileUploader';
import { ColumnMapperModal } from './components/ColumnMapperModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

import {
  ColumnMapping,
  DatasetMetadata,
  DetectedColumns,
  ErrorRecord,
  ParseProgress,
  SearchHistoryItem,
  SearchMatch,
  SearchMode,
  SheetInfo
} from './types/errorCode';

import {
  readWorkbook,
  getSheetSummaries,
  ParseResult
} from './services/excelParser';
import {
  normalizeMultipleSheets,
  normalizeSheetRows
} from './services/dataNormalizer';
import { ErrorIndex } from './services/errorIndexer';
import {
  loadDataset,
  saveDataset,
  clearDataset,
  getSearchHistory,
  addSearchHistory,
  clearSearchHistory,
  getStoredTheme,
  setStoredTheme
} from './services/storage';

export const App: React.FC = () => {
  const [index, setIndex] = useState<ErrorIndex | null>(null);
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(getStoredTheme);

  // Search state
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentMode, setCurrentMode] = useState<SearchMode>('exact');
  const [currentMs, setCurrentMs] = useState('all');
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isExactMatch, setIsExactMatch] = useState(false);

  // History & UI Modals
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  // Sheet & Mapping flow
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingParseResult, setPendingParseResult] = useState<ParseResult | null>(null);
  const [sheetChoices, setSheetChoices] = useState<SheetInfo[] | null>(null);
  const [mapperState, setMapperState] = useState<{
    isOpen: boolean;
    sheetName: string;
    detectedColumns: DetectedColumns;
  } | null>(null);

  // Apply Theme class
  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    setStoredTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Restore dataset on load
  useEffect(() => {
    async function init() {
      setHistory(getSearchHistory());
      const stored = await loadDataset();
      if (stored && stored.records && stored.records.length > 0) {
        const newIndex = new ErrorIndex(stored.records, stored.meta);
        setIndex(newIndex);
        setMetadata(newIndex.getMetadata());
      }
    }
    init();
  }, []);

  // Global keydown for Help modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT';

      if (e.key === '?' && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * Finalizes records, builds index, and persists to IndexedDB
   */
  const commitRecordsAndIndex = async (
    records: ErrorRecord[],
    fileName: string,
    fileSize: number,
    sheetNames: string[],
    selectedSheet: string
  ) => {
    setProgress({ stage: 'indexing', message: 'Building high-speed search index...', percentage: 75 });
    await new Promise((r) => setTimeout(r, 40));

    const meta: Partial<DatasetMetadata> = {
      fileName,
      fileSize,
      uploadedAt: new Date().toISOString(),
      sheetNames,
      selectedSheet
    };

    const newIndex = new ErrorIndex(records, meta);
    const finalMeta = newIndex.getMetadata()!;

    setProgress({ stage: 'saving', message: 'Saving index to local browser storage...', percentage: 90 });
    await saveDataset(finalMeta, records);

    setIndex(newIndex);
    setMetadata(finalMeta);
    setIsUploadModalOpen(false);
    setSheetChoices(null);
    setPendingFile(null);
    setPendingParseResult(null);
    setMapperState(null);
    setProgress({ stage: 'ready', message: 'Ready to search!', percentage: 100 });

    // Reset current search
    setSearchMatches([]);
    setHasSearched(false);
    setCurrentQuery('');
  };

  /**
   * Reads and processes an uploaded file
   */
  const processUploadedFile = async (file: File) => {
    try {
      setProgress({ stage: 'reading', message: `Reading "${file.name}"...`, percentage: 20 });
      setPendingFile(file);

      const buffer = await file.arrayBuffer();
      setProgress({ stage: 'detecting', message: 'Detecting columns and sheets...', percentage: 40 });
      await new Promise((r) => setTimeout(r, 30));

      const parseResult = readWorkbook(buffer);
      setPendingParseResult(parseResult);

      const summaries = getSheetSummaries(parseResult);

      // If multiple sheets exist, show sheet selection modal
      if (summaries.length > 1) {
        setSheetChoices(summaries);
        setProgress(null);
        return;
      }

      // Single sheet file
      const singleSheetName = parseResult.sheetNames[0];
      const sheetData = parseResult.sheetsData.get(singleSheetName);

      if (!sheetData || sheetData.rows.length === 0) {
        alert('The uploaded file does not contain any data rows.');
        setProgress(null);
        return;
      }

      if (!sheetData.detectedColumns.isConfident) {
        // Needs manual mapping
        setMapperState({
          isOpen: true,
          sheetName: singleSheetName,
          detectedColumns: sheetData.detectedColumns
        });
        setProgress(null);
        return;
      }

      // Confident single sheet
      const records = normalizeSheetRows(
        sheetData,
        sheetData.detectedColumns.bestMapping,
        singleSheetName
      );

      if (records.length === 0) {
        alert('No valid error records could be extracted from this sheet.');
        setProgress(null);
        return;
      }

      await commitRecordsAndIndex(
        records,
        file.name,
        file.size,
        parseResult.sheetNames,
        singleSheetName
      );
    } catch (err: any) {
      console.error('File parsing error', err);
      alert(`Failed to parse file: ${err.message || 'Unknown error'}`);
      setProgress(null);
    }
  };

  /**
   * User chose a sheet in the Multi-Sheet selector
   */
  const handleSelectSheetChoice = async (choice: string) => {
    if (!pendingParseResult || !pendingFile) return;

    if (choice === 'all') {
      // Process all sheets
      setProgress({ stage: 'normalizing', message: 'Extracting and normalizing all sheets...', percentage: 55 });
      await new Promise((r) => setTimeout(r, 40));

      const allSheets = Array.from(pendingParseResult.sheetsData.values());
      const records = normalizeMultipleSheets(allSheets);

      if (records.length === 0) {
        alert('No valid error codes found across the sheets in this workbook.');
        setSheetChoices(null);
        setProgress(null);
        return;
      }

      await commitRecordsAndIndex(
        records,
        pendingFile.name,
        pendingFile.size,
        pendingParseResult.sheetNames,
        'all'
      );
    } else {
      // Single specific sheet chosen
      const sheetData = pendingParseResult.sheetsData.get(choice);
      if (!sheetData) return;

      if (!sheetData.detectedColumns.isConfident) {
        setMapperState({
          isOpen: true,
          sheetName: choice,
          detectedColumns: sheetData.detectedColumns
        });
        return;
      }

      const records = normalizeSheetRows(sheetData, sheetData.detectedColumns.bestMapping, choice);
      await commitRecordsAndIndex(
        records,
        pendingFile.name,
        pendingFile.size,
        pendingParseResult.sheetNames,
        choice
      );
    }
  };

  /**
   * Confirmed mapping from ColumnMapperModal
   */
  const handleConfirmMapping = async (mapping: ColumnMapping) => {
    if (!mapperState || !pendingParseResult || !pendingFile) return;

    const sheetData = pendingParseResult.sheetsData.get(mapperState.sheetName);
    if (!sheetData) return;

    const records = normalizeSheetRows(sheetData, mapping, mapperState.sheetName);
    await commitRecordsAndIndex(
      records,
      pendingFile.name,
      pendingFile.size,
      pendingParseResult.sheetNames,
      mapperState.sheetName
    );
  };

  /**
   * 1-Click: Load workspace GnG 8.0 Dataset Sample
   */
  const handleLoadSampleDataset = async () => {
    try {
      setIsLoadingSample(true);
      setProgress({
        stage: 'reading',
        message: 'Fetching GnG 8.0 Error Messages Review.xlsx...',
        percentage: 15
      });

      const response = await fetch('/sample_errors.xlsx');
      if (!response.ok) {
        throw new Error('Could not fetch sample dataset from server.');
      }

      const buffer = await response.arrayBuffer();
      setProgress({
        stage: 'detecting',
        message: 'Parsing 31 microservice sheets in GnG 8.0 workbook...',
        percentage: 40
      });
      await new Promise((r) => setTimeout(r, 40));

      const parseResult = readWorkbook(buffer);
      setProgress({
        stage: 'normalizing',
        message: 'Normalizing and extracting error codes across all sheets...',
        percentage: 60
      });
      await new Promise((r) => setTimeout(r, 40));

      const allSheets = Array.from(parseResult.sheetsData.values());
      const records = normalizeMultipleSheets(allSheets);

      await commitRecordsAndIndex(
        records,
        'GnG 8.0 Error Messages Review.xlsx',
        buffer.byteLength,
        parseResult.sheetNames,
        'all'
      );
    } catch (err: any) {
      console.error('Failed to load sample dataset', err);
      alert(`Could not load sample dataset: ${err.message}`);
    } finally {
      setIsLoadingSample(false);
      setProgress(null);
    }
  };

  /**
   * Clears the current dataset
   */
  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to clear the loaded dataset? You can reload it anytime.')) {
      return;
    }
    await clearDataset();
    setIndex(null);
    setMetadata(null);
    setSearchMatches([]);
    setHasSearched(false);
    setCurrentQuery('');
  };

  /**
   * Executes error search
   */
  const handleSearch = useCallback(
    (query: string, mode: SearchMode, ms: string) => {
      if (!index) return;
      setCurrentQuery(query);
      setCurrentMode(mode);
      setCurrentMs(ms);

      const result = index.search(query, { mode, microservice: ms });

      setSearchMatches(result.matches);
      setSuggestions(result.suggestions);
      setIsExactMatch(result.isExact);
      setHasSearched(true);

      // Record to recent search history
      if (result.matches.length > 0) {
        const sampleMs = result.matches[0].record.microservice;
        const updated = addSearchHistory(query, result.matches.length, sampleMs);
        setHistory(updated);
      }
    },
    [index]
  );

  const handleClearSearch = () => {
    setCurrentQuery('');
    setSearchMatches([]);
    setSuggestions([]);
    setHasSearched(false);
  };

  const handleSelectRecent = (q: string) => {
    setCurrentQuery(q);
    handleSearch(q, currentMode, currentMs);
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setHistory([]);
  };

  const getAutocompleteSuggestions = useCallback(
    (prefix: string) => {
      if (!index) return [];
      return index.getAutocomplete(prefix, 10);
    },
    [index]
  );

  const availableMicroservices = index ? index.getMicroservices() : [];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <Navbar
        metadata={metadata}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onLoadSample={handleLoadSampleDataset}
        onClearData={handleClearData}
        onOpenHelp={() => setIsHelpOpen(true)}
        isLoadingSample={isLoadingSample}
      />

      {/* Main Content Body */}
      <main style={{ flex: 1, paddingBottom: '3rem' }}>
        {metadata && index ? (
          <>
            {/* Primary Search Area */}
            <SearchBar
              onSearch={handleSearch}
              onClear={handleClearSearch}
              getSuggestions={getAutocompleteSuggestions}
              microservices={availableMicroservices}
              initialQuery={currentQuery}
              hasDataset={true}
            />

            {/* Recent Searches */}
            <RecentSearches
              history={history}
              onSelectSearch={handleSelectRecent}
              onClearHistory={handleClearHistory}
            />

            {/* Search Results / Not Found */}
            <SearchResults
              query={currentQuery}
              matches={searchMatches}
              suggestions={suggestions}
              isExact={isExactMatch}
              onSelectSuggestion={(sug) => {
                setCurrentQuery(sug);
                handleSearch(sug, 'exact', currentMs);
              }}
              hasSearched={hasSearched}
            />

            {/* Secondary Dataset Statistics */}
            <DatasetStats
              metadata={metadata}
              onSelectMicroservice={(ms) => {
                setCurrentMs(ms);
                if (currentQuery.trim()) {
                  handleSearch(currentQuery, currentMode, ms);
                }
              }}
            />
          </>
        ) : (
          /* Empty State when no dataset is loaded */
          <EmptyState
            onProcessFile={processUploadedFile}
            onLoadSample={handleLoadSampleDataset}
            isLoadingSample={isLoadingSample}
            progress={progress}
            sheetChoices={sheetChoices}
            onSelectSheetChoice={handleSelectSheetChoice}
            onCancelSheetChoice={() => {
              setSheetChoices(null);
              setPendingFile(null);
              setPendingParseResult(null);
            }}
          />
        )}
      </main>

      {/* Upload/Replace File Modal */}
      <FileUploader
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onProcessFile={processUploadedFile}
        progress={progress}
        sheetChoices={sheetChoices}
        onSelectSheetChoice={handleSelectSheetChoice}
        onCancelSheetChoice={() => {
          setSheetChoices(null);
          setPendingFile(null);
          setPendingParseResult(null);
          setIsUploadModalOpen(false);
        }}
        isModal={true}
      />

      {/* Column Mapping Modal */}
      {mapperState && (
        <ColumnMapperModal
          isOpen={mapperState.isOpen}
          sheetName={mapperState.sheetName}
          detectedColumns={mapperState.detectedColumns}
          onConfirm={handleConfirmMapping}
          onCancel={() => setMapperState(null)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};

export default App;

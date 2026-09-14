import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Filter, SlidersHorizontal } from 'lucide-react';
import { SearchMode } from '../types/errorCode';

interface SearchBarProps {
  onSearch: (query: string, mode: SearchMode, microservice: string) => void;
  onClear: () => void;
  getSuggestions: (prefix: string) => string[];
  microservices: string[];
  initialQuery?: string;
  hasDataset: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onClear,
  getSuggestions,
  microservices,
  initialQuery = '',
  hasDataset
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [searchMode, setSearchMode] = useState<SearchMode>('exact');
  const [selectedMs, setSelectedMs] = useState<string>('all');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync external query changes
  useEffect(() => {
    if (initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Autofocus when dataset is ready
  useEffect(() => {
    if (hasDataset && inputRef.current) {
      inputRef.current.focus();
    }
  }, [hasDataset]);

  // Global keyboard shortcuts: "/" and "Ctrl/Cmd + K"
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in another input/select/textarea
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT';

      if ((e.key === '/' && !isInput) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update suggestions on query change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);

    if (val.trim().length >= 1) {
      const matched = getSuggestions(val.trim());
      setSuggestions(matched);
      setShowDropdown(matched.length > 0);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const executeSearch = (searchVal = query, mode = searchMode, ms = selectedMs) => {
    const trimmed = searchVal.trim();
    setShowDropdown(false);
    if (!trimmed) {
      onClear();
      return;
    }
    onSearch(trimmed, mode, ms);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (!showDropdown || suggestions.length === 0) return;
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      if (!showDropdown || suggestions.length === 0) return;
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showDropdown && activeIndex >= 0 && activeIndex < suggestions.length) {
        const selectedCode = suggestions[activeIndex];
        setQuery(selectedCode);
        executeSearch(selectedCode);
      } else {
        executeSearch();
      }
    } else if (e.key === 'Escape') {
      if (showDropdown) {
        setShowDropdown(false);
      } else {
        setQuery('');
        onClear();
      }
    }
  };

  const handleSelectSuggestion = (code: string) => {
    setQuery(code);
    executeSearch(code);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    onClear();
    inputRef.current?.focus();
  };

  return (
    <section className="search-section">
      <div className="search-container" ref={wrapperRef}>
        <div className="search-title-area">
          <h1 className="search-headline">
            <span>Search Error Code</span>
          </h1>
          <p className="search-subtitle">
            Instant lookup for microservice errors, logs, and descriptions
          </p>
        </div>

        {/* Hero search box */}
        <div className="search-box-wrapper">
          <div className="search-input-row">
            <Search className="search-icon-hero" size={22} />
            <input
              ref={inputRef}
              type="text"
              className="search-main-input"
              placeholder="Enter error code (e.g. LDS0001, ERR_12345)..."
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (query.trim() && suggestions.length > 0) setShowDropdown(true);
              }}
              autoComplete="off"
              spellCheck={false}
              id="main-error-search-input"
            />

            <div className="search-right-controls">
              {query && (
                <button
                  className="btn btn-ghost btn-icon"
                  style={{ width: '1.8rem', height: '1.8rem' }}
                  onClick={handleClear}
                  title="Clear (Esc)"
                >
                  <X size={15} />
                </button>
              )}

              <kbd className="kbd" title="Focus shortcut">
                /
              </kbd>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => executeSearch()}
                id="search-submit-btn"
              >
                <span>Search</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="autocomplete-dropdown" id="autocomplete-suggestions-list">
              {suggestions.map((code, idx) => (
                <div
                  key={code}
                  className={`autocomplete-item ${idx === activeIndex ? 'active' : ''}`}
                  onClick={() => handleSelectSuggestion(code)}
                >
                  <span>{code}</span>
                  <span className="autocomplete-item-count">Select ↵</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls Bar: Mode Toggle & Microservice Filter */}
        <div className="search-controls-bar">
          {/* Microservice Filter */}
          <div className="filter-group">
            <Filter size={15} color="var(--text-secondary)" />
            <label className="filter-label" htmlFor="microservice-filter-select">
              Service:
            </label>
            <select
              id="microservice-filter-select"
              className="select-custom"
              value={selectedMs}
              onChange={(e) => {
                const newMs = e.target.value;
                setSelectedMs(newMs);
                if (query.trim()) {
                  executeSearch(query, searchMode, newMs);
                }
              }}
            >
              <option value="all">All Microservices</option>
              {microservices.map((ms) => (
                <option key={ms} value={ms}>
                  {ms}
                </option>
              ))}
            </select>
          </div>

          {/* Search Mode */}
          <div className="filter-group">
            <span className="filter-label">Search Mode:</span>
            <div className="mode-toggle-group">
              <button
                className={`mode-pill ${searchMode === 'exact' ? 'active' : ''}`}
                onClick={() => {
                  setSearchMode('exact');
                  if (query.trim()) executeSearch(query, 'exact', selectedMs);
                }}
                id="search-mode-exact-btn"
              >
                Exact Search
              </button>
              <button
                className={`mode-pill ${searchMode === 'partial' ? 'active' : ''}`}
                onClick={() => {
                  setSearchMode('partial');
                  if (query.trim()) executeSearch(query, 'partial', selectedMs);
                }}
                id="search-mode-partial-btn"
              >
                Partial / Substring
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

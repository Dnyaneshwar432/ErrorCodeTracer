import React from 'react';
import { Download, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { SearchMatch } from '../types/errorCode';
import { ResultCard } from './ResultCard';
import { exportRecordsToCsv } from '../utils/exportCsv';

interface SearchResultsProps {
  query: string;
  matches: SearchMatch[];
  suggestions: string[];
  isExact: boolean;
  onSelectSuggestion: (code: string) => void;
  hasSearched: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  query,
  matches,
  suggestions,
  isExact,
  onSelectSuggestion,
  hasSearched
}) => {
  if (!hasSearched) return null;

  const handleExport = () => {
    const records = matches.map((m) => m.record);
    const cleanQuery = query.replace(/[^\w-]/g, '_');
    exportRecordsToCsv(records, `error_results_${cleanQuery}.csv`);
  };

  return (
    <section className="results-section container" id="search-results-container">
      {/* Found Results */}
      {matches.length > 0 ? (
        <div>
          <div className="results-header">
            <h2 className="results-count-title">
              <span>Search Results</span>
              <span className="results-badge" id="results-count-badge">
                {matches.length} {matches.length === 1 ? 'match' : 'matches'} found
              </span>
            </h2>

            <button
              className="btn btn-secondary btn-sm"
              onClick={handleExport}
              title="Export results to CSV"
              id="export-results-csv-btn"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="results-grid">
            {matches.map((match, idx) => (
              <ResultCard key={match.record.id || idx} record={match.record} index={idx} />
            ))}
          </div>
        </div>
      ) : (
        /* Not Found State */
        <div className="not-found-card" id="not-found-container">
          <AlertCircle className="not-found-icon" />
          <h2 className="not-found-title">❌ Error Code Not Found</h2>
          <p className="not-found-msg">
            No matching error code for <strong>&quot;{query}&quot;</strong> was found in the uploaded file.
          </p>

          {/* Fuzzy Suggestions */}
          {suggestions.length > 0 && (
            <div className="fuzzy-suggestions-box" id="fuzzy-suggestions-box">
              <span className="fuzzy-suggestions-title">
                <Sparkles size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                Did you mean:
              </span>
              <div className="fuzzy-pill-row">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    className="fuzzy-pill"
                    onClick={() => onSelectSuggestion(sug)}
                    title={`Search ${sug}`}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

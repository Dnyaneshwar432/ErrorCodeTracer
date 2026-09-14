import React from 'react';
import { History, X } from 'lucide-react';
import { SearchHistoryItem } from '../types/errorCode';

interface RecentSearchesProps {
  history: SearchHistoryItem[];
  onSelectSearch: (query: string) => void;
  onClearHistory: () => void;
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({
  history,
  onSelectSearch,
  onClearHistory
}) => {
  if (!history || history.length === 0) return null;

  return (
    <div className="container">
      <div className="search-container">
        <div className="recent-searches-row">
          <span className="recent-label">
            <History size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
            Recent:
          </span>

          {history.map((item) => (
            <button
              key={item.id}
              className="recent-pill"
              onClick={() => onSelectSearch(item.query)}
              title={`Search ${item.query} (${item.matchedCount} matches)`}
            >
              <span>{item.query}</span>
              {item.sampleMicroservice && (
                <span className="recent-ms-tag">— {item.sampleMicroservice}</span>
              )}
            </button>
          ))}

          <button
            className="clear-recent-btn"
            onClick={onClearHistory}
            title="Clear recent search history"
            id="clear-recent-history-btn"
          >
            Clear History
          </button>
        </div>
      </div>
    </div>
  );
};

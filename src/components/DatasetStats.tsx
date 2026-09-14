import React, { useState } from 'react';
import { Database, Hash, Server, Calendar, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { DatasetMetadata } from '../types/errorCode';

interface DatasetStatsProps {
  metadata: DatasetMetadata;
  onSelectMicroservice: (ms: string) => void;
}

export const DatasetStats: React.FC<DatasetStatsProps> = ({ metadata, onSelectMicroservice }) => {
  const [showDistribution, setShowDistribution] = useState(false);

  // Format date
  const formattedDate = (() => {
    try {
      const d = new Date(metadata.uploadedAt);
      return d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  })();

  const distributionEntries = Object.entries(metadata.microserviceDistribution).sort(
    ([, a], [, b]) => b - a
  );

  return (
    <section className="container stats-section" id="dataset-stats-section">
      <div className="stats-header-row">
        <h2 className="stats-title">
          <Database size={17} color="var(--accent-cyan)" />
          <span>Dataset Overview: {metadata.fileName}</span>
        </h2>

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowDistribution(!showDistribution)}
          id="toggle-distribution-btn"
        >
          <BarChart3 size={14} />
          <span>{showDistribution ? 'Hide Distribution' : 'View Service Distribution'}</span>
          {showDistribution ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Stat Metric Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Records</div>
          <div className="stat-value cyan">{metadata.totalRecords.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Unique Error Codes</div>
          <div className="stat-value indigo">{metadata.uniqueErrorCodes.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Microservices</div>
          <div className="stat-value emerald">{metadata.uniqueMicroservices.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Last Updated</div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {formattedDate}
          </div>
        </div>
      </div>

      {/* Collapsible Microservice Distribution */}
      {showDistribution && (
        <div className="ms-distribution-box" id="microservice-distribution-box">
          <div className="ms-dist-title">Microservice Distribution (Click to filter)</div>
          <div className="ms-dist-grid">
            {distributionEntries.map(([msName, count]) => (
              <div
                key={msName}
                className="ms-dist-item"
                onClick={() => onSelectMicroservice(msName)}
                title={`Filter by ${msName}`}
              >
                <span className="ms-dist-name">{msName}</span>
                <span className="ms-dist-count">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

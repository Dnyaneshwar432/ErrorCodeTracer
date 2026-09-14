import React, { useState, useEffect } from 'react';
import { ColumnMapping, DetectedColumns } from '../types/errorCode';

interface ColumnMapperModalProps {
  isOpen: boolean;
  sheetName: string;
  detectedColumns: DetectedColumns;
  onConfirm: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}

export const ColumnMapperModal: React.FC<ColumnMapperModalProps> = ({
  isOpen,
  sheetName,
  detectedColumns,
  onConfirm,
  onCancel
}) => {
  const [mapping, setMapping] = useState<ColumnMapping>({
    errorCodeCol: '',
    microserviceCol: '',
    descriptionCol: ''
  });

  useEffect(() => {
    if (detectedColumns && detectedColumns.bestMapping) {
      setMapping({ ...detectedColumns.bestMapping });
    }
  }, [detectedColumns]);

  if (!isOpen) return null;

  const headers = detectedColumns.allHeaders || [];

  const handleSave = () => {
    if (!mapping.errorCodeCol) {
      alert('Please select a column for Error Code');
      return;
    }
    if (!mapping.descriptionCol) {
      alert('Please select a column for Description');
      return;
    }
    onConfirm(mapping);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Map Columns</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Sheet: <strong>{sheetName}</strong>
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Verify or map the columns from your sheet to the application fields:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Error Code */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Error Code Column <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <select
                className="select-custom"
                style={{ width: '100%' }}
                value={mapping.errorCodeCol}
                onChange={(e) => setMapping({ ...mapping, errorCodeCol: e.target.value })}
                id="mapper-error-code-select"
              >
                <option value="">-- Select Error Code Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Microservice */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Microservice Column (Optional — defaults to Sheet Name)
              </label>
              <select
                className="select-custom"
                style={{ width: '100%' }}
                value={mapping.microserviceCol}
                onChange={(e) => setMapping({ ...mapping, microserviceCol: e.target.value })}
                id="mapper-ms-select"
              >
                <option value="">-- None (Use Sheet Name &quot;{sheetName}&quot;) --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Error Description Column <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <select
                className="select-custom"
                style={{ width: '100%' }}
                value={mapping.descriptionCol}
                onChange={(e) => setMapping({ ...mapping, descriptionCol: e.target.value })}
                id="mapper-desc-select"
              >
                <option value="">-- Select Description Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Scenario */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Scenario / Cause Column (Optional)
              </label>
              <select
                className="select-custom"
                style={{ width: '100%' }}
                value={mapping.scenarioCol || ''}
                onChange={(e) => setMapping({ ...mapping, scenarioCol: e.target.value })}
              >
                <option value="">-- None --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} id="mapper-continue-btn">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Server, FileText } from 'lucide-react';
import { ErrorRecord } from '../types/errorCode';

interface ResultCardProps {
  record: ErrorRecord;
  index: number;
}

export const ResultCard: React.FC<ResultCardProps> = ({ record, index }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = async () => {
    const textToCopy = `Error Code: ${record.errorCode}\nMicroservice: ${record.microservice}\nDescription: ${record.description}${
      record.metadata?.scenario ? `\nScenario: ${record.metadata.scenario}` : ''
    }${record.metadata?.uiMessage ? `\nUI Message: ${record.metadata.uiMessage}` : ''}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
        return;
      }
      throw new Error('Clipboard API unavailable');
    } catch (err) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      } catch (fallbackErr) {
        console.error('Failed to copy', fallbackErr);
      }
    }
  };

  const hasExtraMetadata = Boolean(
    record.metadata?.scenario ||
      record.metadata?.uiMessage ||
      record.metadata?.logMessage ||
      record.metadata?.remarks ||
      record.sourceSheet
  );

  return (
    <article className="result-card" id={`result-card-${index}`}>
      <div className="result-card-top">
        {/* Error code & Microservice */}
        <div className="result-code-group">
          <span className="result-error-code" title="Error Code">
            {record.errorCode}
          </span>
          <span className="result-ms-badge" title="Microservice">
            <Server size={14} />
            <span>{record.microservice}</span>
          </span>
          {record.metadata?.messageType && (
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)'
              }}
            >
              {record.metadata.messageType}
            </span>
          )}
        </div>

        {/* Action button: Copy */}
        <div className="result-actions">
          <button
            className={`copy-button ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Copy error details for Slack, Jira, or debugging"
            id={`copy-btn-${index}`}
          >
            {copied ? (
              <>
                <Check size={14} />
                <span>✓ Copied</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Description box */}
      <div className="result-description-box">
        <div className="result-desc-label">Error Description</div>
        <p className="result-description-text">{record.description}</p>
      </div>

      {/* Expandable Technical Context */}
      {hasExtraMetadata && (
        <div>
          <button
            className="result-context-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} />
                <span>Hide Technical Context</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                <span>View Technical Context &amp; Logs</span>
              </>
            )}
          </button>

          {isExpanded && (
            <div className="result-context-panel">
              {record.metadata?.scenario && (
                <div>
                  <div className="context-item-title">Trigger Scenario / Condition</div>
                  <div className="context-item-val">{record.metadata.scenario}</div>
                </div>
              )}

              {record.metadata?.uiMessage && (
                <div>
                  <div className="context-item-title">UI Display Message</div>
                  <div className="context-item-val">{record.metadata.uiMessage}</div>
                </div>
              )}

              {record.metadata?.logMessage && (
                <div>
                  <div className="context-item-title">Backend Log Message</div>
                  <div className="context-item-val font-mono">{record.metadata.logMessage}</div>
                </div>
              )}

              {record.metadata?.remarks && (
                <div>
                  <div className="context-item-title">Remarks / Notes</div>
                  <div className="context-item-val">{record.metadata.remarks}</div>
                </div>
              )}

              {record.sourceSheet && (
                <div>
                  <div className="context-item-title">Source Location</div>
                  <div className="context-item-val">
                    Sheet: <strong>{record.sourceSheet}</strong>
                    {record.sourceRow ? ` (Row #${record.sourceRow})` : ''}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
};

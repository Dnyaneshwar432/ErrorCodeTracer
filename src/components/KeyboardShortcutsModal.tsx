import React from 'react';
import { X, Command, CornerDownLeft } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Keyboard Shortcuts</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>×</span>
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Focus Search Input</span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <kbd className="kbd">/</kbd>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>or</span>
                <kbd className="kbd">Ctrl</kbd> + <kbd className="kbd">K</kbd>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Execute Search</span>
              <kbd className="kbd">Enter</kbd>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Clear Search / Close Suggestions</span>
              <kbd className="kbd">Esc</kbd>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Navigate Autocomplete</span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <kbd className="kbd">↑</kbd>
                <kbd className="kbd">↓</kbd>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Select Autocomplete Suggestion</span>
              <kbd className="kbd">Enter</kbd>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

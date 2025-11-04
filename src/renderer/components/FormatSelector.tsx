import React from 'react';
import { useStore } from '../store';
import { EMOTE_SPECS } from '../../shared/types';

const FormatSelector: React.FC = () => {
  const { enabledFormats, toggleFormat, selectAllFormats, selectNoFormats } = useStore();

  return (
    <div className="format-selector">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Export Formats</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="button button-secondary" onClick={selectAllFormats} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            Select All
          </button>
          <button className="button button-secondary" onClick={selectNoFormats} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            Select None
          </button>
        </div>
      </div>
      <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Select which formats to generate (at least one required)
      </p>
      <div className="format-checkboxes">
        {Object.entries(EMOTE_SPECS).map(([formatKey, spec]) => (
          <div key={formatKey} className="format-checkbox-item">
            <input
              type="checkbox"
              id={`format-${formatKey}`}
              checked={enabledFormats.has(formatKey)}
              onChange={() => toggleFormat(formatKey)}
            />
            <label htmlFor={`format-${formatKey}`}>
              <span className="format-name">{spec.name}</span>
              <span className="format-description">{spec.description}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FormatSelector;

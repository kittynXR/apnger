import React from 'react';
import { useStore } from '../store';
import { EMOTE_SPECS } from '../../shared/types';

const FormatSelector: React.FC = () => {
  const { enabledFormats, toggleFormat } = useStore();

  return (
    <div className="format-selector">
      <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Export Formats</h3>
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

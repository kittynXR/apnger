import React, { useEffect } from 'react';
import { useStore } from '../store';
import { EMOTE_SPECS } from '../../shared/types';

const FormatSelector: React.FC = () => {
  const { enabledFormats, toggleFormat, selectAllFormats, selectNoFormats, videoInfo, cropArea } = useStore();

  // Check if current crop is square (or close enough)
  const isSquareCrop = cropArea
    ? Math.abs(cropArea.width - cropArea.height) < 5 // Allow 5px tolerance
    : videoInfo
    ? Math.abs(videoInfo.width - videoInfo.height) < 5 // Check if original video is square
    : false;

  // Formats that require square aspect ratio
  const squareOnlyFormats = ['twitch', 'discord-sticker', 'discord-emote', 'vrc-spritesheet'];

  // Auto-disable incompatible formats when crop becomes non-square
  useEffect(() => {
    if (!isSquareCrop) {
      // Uncheck any enabled square-only formats
      squareOnlyFormats.forEach(format => {
        if (enabledFormats.has(format)) {
          toggleFormat(format);
        }
      });
    }
  }, [isSquareCrop]); // Run when square crop status changes

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
        {Object.entries(EMOTE_SPECS).map(([formatKey, spec]) => {
          const requiresSquare = squareOnlyFormats.includes(formatKey);
          const isDisabled = requiresSquare && !isSquareCrop;

          return (
            <div
              key={formatKey}
              className="format-checkbox-item"
              style={{
                opacity: isDisabled ? 0.5 : 1,
                cursor: isDisabled ? 'not-allowed' : 'auto',
              }}
            >
              <input
                type="checkbox"
                id={`format-${formatKey}`}
                checked={enabledFormats.has(formatKey)}
                disabled={isDisabled}
                onChange={() => toggleFormat(formatKey)}
              />
              <label htmlFor={`format-${formatKey}`} style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}>
                <span className="format-name">
                  {spec.name}
                  {requiresSquare && ' (Requires Square Crop)'}
                </span>
                <span className="format-description">{spec.description}</span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FormatSelector;

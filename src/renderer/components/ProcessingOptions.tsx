import React from 'react';
import { useStore } from '../store';

const ProcessingOptions: React.FC = () => {
  const { options, updateOption } = useStore();

  const handleChromaKeyToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateOption('chromaKey', {
      ...options.chromaKey!,
      enabled: e.target.checked,
    });
  };

  const handleChromaKeyColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateOption('chromaKey', {
      ...options.chromaKey!,
      color: e.target.value,
    });
  };

  const handleSimilarityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateOption('chromaKey', {
      ...options.chromaKey!,
      similarity: parseFloat(e.target.value),
    });
  };

  const handleBlendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateOption('chromaKey', {
      ...options.chromaKey!,
      blend: parseFloat(e.target.value),
    });
  };

  const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateOption('quality', e.target.value as 'maximum' | 'balanced' | 'smallest');
  };

  return (
    <div>
      <div className="form-group">
        <div className="checkbox-group">
          <input
            type="checkbox"
            id="chromakey-enabled"
            checked={options.chromaKey?.enabled || false}
            onChange={handleChromaKeyToggle}
          />
          <label htmlFor="chromakey-enabled">Enable Chroma Key (Remove Background)</label>
        </div>
      </div>

      {options.chromaKey?.enabled && (
        <>
          <div className="form-group">
            <label htmlFor="chromakey-color">Background Color</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input
                type="color"
                id="chromakey-color"
                value={options.chromaKey.color}
                onChange={handleChromaKeyColorChange}
                style={{ width: '100px', flex: 'none' }}
              />
              <input
                type="text"
                value={options.chromaKey.color}
                onChange={handleChromaKeyColorChange}
                style={{ flex: 1 }}
              />
            </div>
            <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
              Click the color picker to select the background color to remove (e.g., green screen)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="chromakey-similarity">
              Color Similarity: {(options.chromaKey.similarity * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              id="chromakey-similarity"
              min="0"
              max="1"
              step="0.01"
              value={options.chromaKey.similarity}
              onChange={handleSimilarityChange}
              style={{ width: '100%' }}
            />
            <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
              Higher values remove more shades of the selected color
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="chromakey-blend">
              Edge Blend: {(options.chromaKey.blend * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              id="chromakey-blend"
              min="0"
              max="1"
              step="0.01"
              value={options.chromaKey.blend}
              onChange={handleBlendChange}
              style={{ width: '100%' }}
            />
            <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
              Softens edges for smoother transparency
            </small>
          </div>
        </>
      )}

      <div className="form-group">
        <label htmlFor="quality">Quality Preset</label>
        <select id="quality" value={options.quality} onChange={handleQualityChange}>
          <option value="maximum">Maximum Quality</option>
          <option value="balanced">Balanced (Recommended)</option>
          <option value="smallest">Smallest File Size</option>
        </select>
        <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
          Affects frame rate and compression settings
        </small>
      </div>
    </div>
  );
};

export default ProcessingOptions;

import React from 'react';
import { useStore } from '../store';

const ResultsDisplay: React.FC = () => {
  const { results } = useStore();

  if (results.length === 0) {
    return null;
  }

  const formatFileSize = (bytes: number): string => {
    const kb = bytes / 1024;
    return `${kb.toFixed(2)} KB`;
  };

  return (
    <div className="card">
      <h2>✅ Export Results</h2>
      <div className="results-grid">
        {results.map((result, index) => (
          <div
            key={index}
            className={`result-card ${result.success ? 'success' : 'error'}`}
          >
            <div className="result-icon">
              {result.success ? '✅' : '❌'}
            </div>
            <div className="result-name">{result.format}</div>
            {result.success ? (
              <>
                <div className="result-size">{formatFileSize(result.size)}</div>
                <div style={{ fontSize: '0.75rem', color: '#8080a0', marginTop: '0.5rem', wordBreak: 'break-all' }}>
                  {result.path}
                </div>
              </>
            ) : (
              <div className="result-error">
                {result.error || 'Failed'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsDisplay;

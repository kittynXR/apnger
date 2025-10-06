import React from 'react';
import { useStore } from '../store';

const ProgressDisplay: React.FC = () => {
  const { progress } = useStore();

  if (progress.size === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
        <div>Initializing...</div>
      </div>
    );
  }

  return (
    <div>
      {Array.from(progress.entries()).map(([format, prog]) => (
        <div key={format} className="progress-container">
          <div className="progress-label">
            <span>{format}</span>
            <span>{prog.stage} - {prog.progress}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${prog.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProgressDisplay;

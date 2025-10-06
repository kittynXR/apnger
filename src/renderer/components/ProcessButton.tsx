import React from 'react';
import { useStore } from '../store';

const ProcessButton: React.FC = () => {
  const {
    videoFile,
    outputDir,
    options,
    isProcessing,
    setIsProcessing,
    setResults,
    reset: resetStore,
  } = useStore();

  const canProcess = videoFile && outputDir && !isProcessing;

  const handleProcess = async () => {
    if (!canProcess || !videoFile || !outputDir) return;

    setIsProcessing(true);
    setResults([]);

    try {
      if (window.electronAPI) {
        const formats = [
          { name: 'twitch', enabled: true },
          { name: 'discord-sticker', enabled: true },
          { name: 'discord-emote', enabled: true },
          { name: '7tv', enabled: true },
        ];

        const results = await window.electronAPI.processVideo(
          videoFile,
          outputDir,
          options,
          formats as any
        );

        setResults(results);
      }
    } catch (error) {
      console.error('Processing error:', error);
      alert('An error occurred during processing. Please check the console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset? This will clear all current settings.')) {
      resetStore();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <button
        className="button button-primary"
        onClick={handleProcess}
        disabled={!canProcess}
        style={{ flex: 1, minWidth: '200px' }}
      >
        {isProcessing ? (
          <>⏳ Processing...</>
        ) : (
          <>🚀 Export All Formats</>
        )}
      </button>

      <button
        className="button button-secondary"
        onClick={handleReset}
        disabled={isProcessing}
      >
        🔄 Reset
      </button>
    </div>
  );
};

export default ProcessButton;

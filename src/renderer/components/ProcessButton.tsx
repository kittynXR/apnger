import React from 'react';
import { useStore } from '../store';

const ProcessButton: React.FC = () => {
  const {
    videoFile,
    outputDir,
    options,
    enabledFormats,
    editMode,
    trimRange,
    segments,
    isProcessing,
    setIsProcessing,
    setResults,
    reset: resetStore,
  } = useStore();

  const canProcess = videoFile && outputDir && !isProcessing && enabledFormats.size > 0;

  const handleProcess = async () => {
    if (!canProcess || !videoFile || !outputDir) return;

    if (enabledFormats.size === 0) {
      alert('Please select at least one export format.');
      return;
    }

    setIsProcessing(true);
    setResults([]);

    try {
      if (window.electronAPI) {
        // Convert Set to array of format objects
        const formats = Array.from(enabledFormats).map(name => ({
          name,
          enabled: true,
        }));

        // Include trim/segment data in options
        const processingOptions = {
          ...options,
          // Add trim if in simple-trim mode and trimRange is set
          ...(editMode === 'simple-trim' && trimRange ? { trim: trimRange } : {}),
          // Add segments if in multi-segment mode
          ...(editMode === 'multi-segment' && segments.length > 0 ? { segments } : {}),
        };

        const results = await window.electronAPI.processVideo(
          videoFile,
          outputDir,
          processingOptions,
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
          <>🚀 Export {enabledFormats.size} Format{enabledFormats.size !== 1 ? 's' : ''}</>
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

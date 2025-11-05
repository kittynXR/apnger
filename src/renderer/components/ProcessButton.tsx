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
    videoInfo,
    cropArea,
    isProcessing,
    setIsProcessing,
    setResults,
    reset: resetStore,
  } = useStore();

  // Check if current crop is square
  const isSquareCrop = cropArea
    ? Math.abs(cropArea.width - cropArea.height) < 5
    : videoInfo
    ? Math.abs(videoInfo.width - videoInfo.height) < 5
    : false;

  // Formats that require square aspect ratio
  const squareOnlyFormats = ['twitch', 'discord-sticker', 'discord-emote', 'vrc-spritesheet'];

  // Filter out incompatible formats
  const compatibleFormats = Array.from(enabledFormats).filter(format => {
    const requiresSquare = squareOnlyFormats.includes(format);
    return !requiresSquare || isSquareCrop;
  });

  const canProcess = videoFile && outputDir && !isProcessing && compatibleFormats.length > 0;

  const handleProcess = async () => {
    if (!canProcess || !videoFile || !outputDir) return;

    if (compatibleFormats.length === 0) {
      alert('Please select at least one compatible export format. Some formats require square crop.');
      return;
    }

    setIsProcessing(true);
    setResults([]);

    try {
      if (window.electronAPI) {
        // Convert filtered formats to array of format objects
        const formats = compatibleFormats.map(name => ({
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
          <>🚀 Export {compatibleFormats.length} Format{compatibleFormats.length !== 1 ? 's' : ''}</>
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

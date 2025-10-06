import React, { useCallback, useState } from 'react';
import { useStore } from '../store';

const FileInput: React.FC = () => {
  const { videoFile, videoInfo, setVideoFile, setVideoInfo, outputDir, setOutputDir } = useStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback(async (file: string) => {
    setVideoFile(file);
    if (window.electronAPI) {
      try {
        const info = await window.electronAPI.getVideoInfo(file);
        setVideoInfo(info);
      } catch (error) {
        console.error('Error getting video info:', error);
        alert('Failed to read video file. Please make sure it\'s a valid video file.');
        setVideoFile(null);
      }
    }
  }, [setVideoFile, setVideoInfo]);

  const handleBrowse = async () => {
    if (window.electronAPI) {
      const file = await window.electronAPI.selectVideoFile();
      if (file) {
        handleFileSelect(file);
      }
    }
  };

  const handleOutputDirSelect = async () => {
    if (window.electronAPI) {
      const dir = await window.electronAPI.selectOutputDirectory();
      if (dir) {
        setOutputDir(dir);
      }
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];

      // Use Electron's webUtils to get the file path
      if (window.electronAPI) {
        try {
          const filePath = window.electronAPI.getPathForFile(file);
          console.log('Got file path:', filePath);
          handleFileSelect(filePath);
        } catch (error) {
          console.error('Error getting file path:', error);
          alert('Could not get file path. Please use the Browse button instead.');
        }
      }
    }
  }, [handleFileSelect]);

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onClick={handleBrowse}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="drop-zone-icon">🎬</div>
        {!videoFile ? (
          <>
            <div className="drop-zone-text">
              Drop a video file here or click to browse
            </div>
            <div className="drop-zone-subtext">
              Supports MP4, MOV, AVI, WebM, MKV, FLV
            </div>
          </>
        ) : (
          <div className="drop-zone-text">
            📁 {videoInfo?.name || 'Video loaded'}
          </div>
        )}
      </div>

      {videoInfo && (
        <div className="video-info">
          <h3 style={{ marginBottom: '1rem' }}>Video Information</h3>
          <div className="video-info-grid">
            <div className="video-info-item">
              <span className="label">Resolution</span>
              <span className="value">{videoInfo.width} × {videoInfo.height}</span>
            </div>
            <div className="video-info-item">
              <span className="label">Frame Rate</span>
              <span className="value">{videoInfo.fps} fps</span>
            </div>
            <div className="video-info-item">
              <span className="label">Duration</span>
              <span className="value">{formatDuration(videoInfo.duration)}</span>
            </div>
            <div className="video-info-item">
              <span className="label">File Size</span>
              <span className="value">{formatFileSize(videoInfo.size)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="form-group" style={{ marginTop: '1.5rem' }}>
        <label>Output Directory</label>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input
            type="text"
            value={outputDir || ''}
            readOnly
            placeholder="Select output directory..."
            style={{ flex: 1 }}
          />
          <button className="button button-secondary" onClick={handleOutputDirSelect}>
            Browse
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileInput;

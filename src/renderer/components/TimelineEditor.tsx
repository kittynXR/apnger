import React, { useState } from 'react';
import { useStore } from '../store';

const TimelineEditor: React.FC = () => {
  const {
    videoInfo,
    editMode,
    trimRange,
    segments,
    setEditMode,
    setTrimRange,
    addSegment,
    removeSegment,
    toggleSegment,
    updateSegment,
  } = useStore();

  const [tempStart, setTempStart] = useState(0);
  const [tempEnd, setTempEnd] = useState(0);

  if (!videoInfo) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
        <p>Load a video to use the timeline editor</p>
      </div>
    );
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const handleApplyTrim = () => {
    setTrimRange({ start: tempStart, end: tempEnd });
  };

  const handleAddSegment = () => {
    const id = `segment-${Date.now()}`;
    addSegment({
      id,
      startTime: tempStart,
      endTime: tempEnd,
      enabled: true,
    });
    // Reset inputs
    setTempStart(0);
    setTempEnd(videoInfo.duration);
  };

  return (
    <div className="timeline-editor">
      <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Timeline Editor</h3>

      {/* Mode Selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0a0c0' }}>
          Edit Mode:
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`button ${editMode === 'simple-trim' ? 'button-primary' : 'button-secondary'}`}
            onClick={() => setEditMode('simple-trim')}
          >
            Simple Trim
          </button>
          <button
            className={`button ${editMode === 'multi-segment' ? 'button-primary' : 'button-secondary'}`}
            onClick={() => setEditMode('multi-segment')}
          >
            Multi-Segment
          </button>
        </div>
      </div>

      {/* Video Duration Info */}
      <div
        style={{
          padding: '0.75rem',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.9rem',
          color: '#a0a0c0',
        }}
      >
        <strong style={{ color: '#e0e0f0' }}>Video Duration:</strong> {formatTime(videoInfo.duration)} ({videoInfo.duration.toFixed(2)}s)
      </div>

      {/* Simple Trim Mode */}
      {editMode === 'simple-trim' && (
        <div className="simple-trim">
          <div className="form-group">
            <label htmlFor="trim-start">Start Time (seconds)</label>
            <input
              id="trim-start"
              type="number"
              min={0}
              max={videoInfo.duration}
              step={0.1}
              value={tempStart}
              onChange={(e) => setTempStart(parseFloat(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="trim-end">End Time (seconds)</label>
            <input
              id="trim-end"
              type="number"
              min={tempStart}
              max={videoInfo.duration}
              step={0.1}
              value={tempEnd || videoInfo.duration}
              onChange={(e) => setTempEnd(parseFloat(e.target.value))}
            />
          </div>

          <button className="button button-primary" onClick={handleApplyTrim}>
            Apply Trim
          </button>

          {trimRange && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(102, 126, 234, 0.2)',
                border: '1px solid rgba(102, 126, 234, 0.5)',
                borderRadius: '8px',
              }}
            >
              <strong>Active Trim:</strong> {formatTime(trimRange.start)} → {formatTime(trimRange.end)}
            </div>
          )}
        </div>
      )}

      {/* Multi-Segment Mode */}
      {editMode === 'multi-segment' && (
        <div className="multi-segment">
          <div className="form-group">
            <label htmlFor="segment-start">Segment Start (seconds)</label>
            <input
              id="segment-start"
              type="number"
              min={0}
              max={videoInfo.duration}
              step={0.1}
              value={tempStart}
              onChange={(e) => setTempStart(parseFloat(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="segment-end">Segment End (seconds)</label>
            <input
              id="segment-end"
              type="number"
              min={tempStart}
              max={videoInfo.duration}
              step={0.1}
              value={tempEnd || videoInfo.duration}
              onChange={(e) => setTempEnd(parseFloat(e.target.value))}
            />
          </div>

          <button className="button button-primary" onClick={handleAddSegment}>
            + Add Segment
          </button>

          {/* Segment List */}
          {segments.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.75rem', color: '#e0e0f0' }}>Segments ({segments.length}):</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {segments.map((segment, index) => (
                  <div
                    key={segment.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: segment.enabled
                        ? 'rgba(102, 126, 234, 0.2)'
                        : 'rgba(0, 0, 0, 0.3)',
                      border: segment.enabled
                        ? '1px solid rgba(102, 126, 234, 0.5)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={segment.enabled}
                      onChange={() => toggleSegment(segment.id)}
                    />
                    <span style={{ flex: 1, color: '#e0e0f0' }}>
                      Segment {index + 1}: {formatTime(segment.startTime)} → {formatTime(segment.endTime)}
                    </span>
                    <button
                      className="button button-secondary"
                      onClick={() => removeSegment(segment.id)}
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimelineEditor;

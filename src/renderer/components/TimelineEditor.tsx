import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';

const TimelineEditor: React.FC = () => {
  const {
    videoInfo,
    videoElement,
    editMode,
    trimRange,
    segments,
    currentVideoTime,
    setEditMode,
    setTrimRange,
    setCurrentVideoTime,
    addSegment,
    removeSegment,
    toggleSegment,
  } = useStore();

  const [currentFrame, setCurrentFrame] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [segmentStart, setSegmentStart] = useState(0);
  const [segmentEnd, setSegmentEnd] = useState(0);
  const [timelineWidth, setTimelineWidth] = useState(1000);
  const timelineRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update timeline width when ref is available or on resize
  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);

    return () => {
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  if (!videoInfo) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
        <p>Load a video to use the timeline editor</p>
      </div>
    );
  }

  const frameDuration = 1 / videoInfo.fps;
  const currentFrameNumber = Math.floor(currentVideoTime * videoInfo.fps);

  // Format time as MM:SS:FF (minutes:seconds:frames)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * videoInfo.fps);
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  // Snap time to nearest frame boundary
  const snapToFrame = (time: number): number => {
    return Math.round(time * videoInfo.fps) / videoInfo.fps;
  };

  // Convert time to pixel position on timeline
  const timeToPosition = (time: number): number => {
    return (time / videoInfo.duration) * timelineWidth;
  };

  // Convert pixel position to time
  const positionToTime = (x: number): number => {
    return (x / timelineWidth) * videoInfo.duration;
  };

  // Extract current frame to canvas
  const extractFrame = useCallback(async () => {
    if (!videoElement || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Wait for video to seek
    await new Promise<void>((resolve) => {
      videoElement.currentTime = currentVideoTime;
      videoElement.onseeked = () => {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        resolve();
      };
    });
  }, [videoElement, currentVideoTime]);

  // Update frame when time changes
  useEffect(() => {
    extractFrame();
  }, [currentVideoTime, extractFrame]);

  // Step forward/backward by one frame
  const stepFrame = (direction: 'prev' | 'next') => {
    const newTime = currentVideoTime + (direction === 'next' ? frameDuration : -frameDuration);
    const clampedTime = Math.max(0, Math.min(newTime, videoInfo.duration));
    const snappedTime = snapToFrame(clampedTime);
    setCurrentVideoTime(snappedTime);
  };

  // Handle timeline click
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const time = snapToFrame(positionToTime(x));
    setCurrentVideoTime(Math.max(0, Math.min(time, videoInfo.duration)));
  };

  // Handle playhead drag
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const time = snapToFrame(positionToTime(x));
      setCurrentVideoTime(Math.max(0, Math.min(time, videoInfo.duration)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, videoInfo.duration, timelineWidth]);

  // Set trim points
  const setTrimStart = () => {
    setTrimRange({ start: currentVideoTime, end: trimRange?.end || videoInfo.duration });
  };

  const setTrimEnd = () => {
    setTrimRange({ start: trimRange?.start || 0, end: currentVideoTime });
  };

  const clearTrim = () => {
    setTrimRange(null);
  };

  // Set segment start to current time
  const setSegmentStartHere = () => {
    setSegmentStart(currentVideoTime);
  };

  // Set segment end to current time
  const setSegmentEndHere = () => {
    setSegmentEnd(currentVideoTime);
  };

  // Add segment with the current start/end values
  const handleAddSegment = () => {
    const id = `segment-${Date.now()}`;
    const start = segmentStart;
    const end = segmentEnd;

    if (end > start) {
      addSegment({ id, startTime: start, endTime: end, enabled: true });
      // Reset for next segment
      setSegmentStart(0);
      setSegmentEnd(0);
    } else {
      alert('End time must be after start time');
    }
  };

  // Clear all segments
  const clearAllSegments = () => {
    segments.forEach(seg => removeSegment(seg.id));
  };

  // Calculate timeline marker positions
  const getTimeMarkers = () => {
    const duration = videoInfo.duration;
    let interval = 1; // Default: 1 second

    if (duration > 60) interval = 10;
    else if (duration > 30) interval = 5;
    else if (duration > 10) interval = 2;

    const markers: number[] = [];
    for (let t = 0; t <= duration; t += interval) {
      markers.push(t);
    }
    return markers;
  };

  const timeMarkers = getTimeMarkers();

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

      {/* Video Frame Preview */}
      <div className="timeline-preview" style={{ marginBottom: '1rem' }}>
        <canvas
          ref={canvasRef}
          width={videoInfo.width}
          height={videoInfo.height}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '360px',
            backgroundColor: '#000',
            borderRadius: '8px',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Current Time Display */}
      <div
        style={{
          padding: '0.75rem',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          marginBottom: '1rem',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e0e0f0', fontFamily: 'monospace' }}>
          {formatTime(currentVideoTime)}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#a0a0c0', marginTop: '0.25rem' }}>
          Frame {currentFrameNumber} of {Math.floor(videoInfo.duration * videoInfo.fps)}
        </div>
      </div>

      {/* Playback Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
        <button className="button button-secondary" onClick={() => stepFrame('prev')}>
          ⏮ Prev Frame
        </button>
        <button className="button button-secondary" onClick={() => setCurrentVideoTime(0)}>
          ⏪ Start
        </button>
        <button className="button button-secondary" onClick={() => setCurrentVideoTime(videoInfo.duration)}>
          ⏩ End
        </button>
        <button className="button button-secondary" onClick={() => stepFrame('next')}>
          Next Frame ⏭
        </button>
      </div>

      {/* Visual Timeline */}
      <div className="timeline-container" style={{ marginBottom: '1.5rem' }}>
        <div
          ref={timelineRef}
          className="timeline-track"
          onClick={handleTimelineClick}
          style={{
            position: 'relative',
            height: '60px',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            cursor: 'pointer',
            overflow: 'visible',
          }}
        >
          {/* Time Markers */}
          {timeMarkers.map((time) => {
            const pos = timeToPosition(time);
            return (
              <div
                key={time}
                style={{
                  position: 'absolute',
                  left: `${pos}px`,
                  top: 0,
                  bottom: 0,
                  width: '1px',
                  background: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '-20px',
                    left: '-20px',
                    width: '40px',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: '#a0a0c0',
                  }}
                >
                  {Math.floor(time)}s
                </span>
              </div>
            );
          })}

          {/* Trim Region Overlay (Simple Trim Mode) */}
          {editMode === 'simple-trim' && trimRange && (
            <div
              style={{
                position: 'absolute',
                left: `${timeToPosition(trimRange.start)}px`,
                width: `${timeToPosition(trimRange.end - trimRange.start)}px`,
                top: 0,
                bottom: 0,
                background: 'rgba(102, 126, 234, 0.3)',
                border: '2px solid rgba(102, 126, 234, 0.6)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Segment Bars (Multi-Segment Mode) */}
          {editMode === 'multi-segment' &&
            segments.map((segment) => {
              if (!segment.enabled) return null;
              return (
                <div
                  key={segment.id}
                  style={{
                    position: 'absolute',
                    left: `${timeToPosition(segment.startTime)}px`,
                    width: `${timeToPosition(segment.endTime - segment.startTime)}px`,
                    top: '10px',
                    height: '40px',
                    background: 'rgba(102, 126, 234, 0.4)',
                    border: '1px solid rgba(102, 126, 234, 0.8)',
                    pointerEvents: 'none',
                  }}
                />
              );
            })}

          {/* Playhead */}
          <div
            onMouseDown={handlePlayheadMouseDown}
            style={{
              position: 'absolute',
              left: `${timeToPosition(currentVideoTime)}px`,
              top: '-10px',
              bottom: '-10px',
              width: '3px',
              background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 0 10px rgba(102, 126, 234, 0.8)',
              cursor: 'ew-resize',
              zIndex: 10,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-5px',
                left: '-6px',
                width: '15px',
                height: '15px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: '2px solid #fff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Trim Controls */}
      {editMode === 'simple-trim' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button className="button button-primary" onClick={setTrimStart}>
              Set Start Here
            </button>
            <button className="button button-primary" onClick={setTrimEnd}>
              Set End Here
            </button>
            <button className="button button-secondary" onClick={clearTrim}>
              Clear Trim
            </button>
          </div>

          {trimRange && (
            <div
              style={{
                padding: '0.75rem',
                background: 'rgba(102, 126, 234, 0.2)',
                border: '1px solid rgba(102, 126, 234, 0.5)',
                borderRadius: '8px',
              }}
            >
              <strong>Active Trim:</strong> {formatTime(trimRange.start)} → {formatTime(trimRange.end)} (
              {(trimRange.end - trimRange.start).toFixed(2)}s)
            </div>
          )}
        </div>
      )}

      {/* Segment Controls */}
      {editMode === 'multi-segment' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ color: '#a0a0c0', marginBottom: '0.75rem' }}>
              Scrub to desired positions and mark segment boundaries:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button className="button button-primary" onClick={setSegmentStartHere}>
                Mark Start ({formatTime(segmentStart)})
              </button>
              <button className="button button-primary" onClick={setSegmentEndHere}>
                Mark End ({formatTime(segmentEnd)})
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="button button-primary"
                onClick={handleAddSegment}
                disabled={segmentEnd <= segmentStart}
                style={{ flex: 1 }}
              >
                + Add Segment
              </button>
              {segments.length > 0 && (
                <button className="button button-secondary" onClick={clearAllSegments}>
                  Clear All Segments
                </button>
              )}
            </div>
          </div>

          {segments.length > 0 && (
            <div>
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
                      background: segment.enabled ? 'rgba(102, 126, 234, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                      border: segment.enabled ? '1px solid rgba(102, 126, 234, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                    }}
                  >
                    <input type="checkbox" checked={segment.enabled} onChange={() => toggleSegment(segment.id)} />
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

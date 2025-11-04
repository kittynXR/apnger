import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';
import CropEditor from './CropEditor';
import TimelineEditor from './TimelineEditor';

type TabType = 'preview' | 'timeline' | 'crop';

const VideoEditor: React.FC = () => {
  const {
    videoFile,
    videoInfo,
    setVideoElement,
    setCropArea,
  } = useStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('preview');
  const [sampleFrames, setSampleFrames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);

  // Generate sample frames
  const generateSampleFrames = useCallback(async () => {
    if (!videoRef.current || !videoInfo) {
      console.log('Cannot generate frames - missing video or info');
      return;
    }

    console.log('Generating sample frames...');
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Cannot get canvas context');
      return;
    }

    canvas.width = videoInfo.width;
    canvas.height = videoInfo.height;

    const frames: string[] = [];
    const sampleTimes = [
      0.1, // Start
      videoInfo.duration * 0.33, // 1/3
      videoInfo.duration * 0.66, // 2/3
    ];

    for (const time of sampleTimes) {
      video.currentTime = time;
      await new Promise((resolve) => {
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          frames.push(dataUrl);
          console.log(`Frame at ${time.toFixed(2)}s extracted`);
          resolve(null);
        };
      });
    }

    console.log(`Generated ${frames.length} sample frames`);
    setSampleFrames(frames);
  }, [videoInfo]);

  // Set video element in store when it's ready
  useEffect(() => {
    if (videoRef.current && videoBlobUrl) {
      console.log('Setting video element in store:', videoRef.current);
      setVideoElement(videoRef.current);
    }
    return () => {
      console.log('Clearing video element from store');
      setVideoElement(null);
    };
  }, [setVideoElement, videoBlobUrl]);

  // Handle video loaded and generate frames
  const handleVideoLoaded = useCallback(async () => {
    console.log('Video loaded event fired');
    setIsLoading(false);

    if (!videoInfo) {
      console.log('No video info available yet');
      return;
    }

    // Make sure video element is set in store
    if (videoRef.current) {
      console.log('Setting video element from handleVideoLoaded');
      setVideoElement(videoRef.current);
    }

    // Set default crop to center square
    const size = Math.min(videoInfo.width, videoInfo.height);
    const x = (videoInfo.width - size) / 2;
    const y = (videoInfo.height - size) / 2;
    setCropArea({ x, y, width: size, height: size });

    // Generate sample frames
    await generateSampleFrames();
  }, [videoInfo, setCropArea, generateSampleFrames, setVideoElement]);

  useEffect(() => {
    console.log('=== VideoEditor Render ===');
    console.log('videoFile:', videoFile);
    console.log('videoInfo:', videoInfo);

    const loadVideo = async () => {
      if (!videoFile || !window.electronAPI) {
        console.log('No video file or electron API');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Reading video file...');
        setIsLoading(true);

        // Create blob URL for video
        const buffer = await window.electronAPI.readVideoFile(videoFile);
        const blob = new Blob([buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        console.log('Video blob URL created:', url);

        setVideoBlobUrl(url);
        setIsLoading(false);

        return () => {
          console.log('Cleaning up video blob URL');
          URL.revokeObjectURL(url);
        };
      } catch (error) {
        console.error('Error loading video:', error);
        setIsLoading(false);
      }
    };

    loadVideo();
  }, [videoFile, videoInfo]);

  if (!videoFile || !videoInfo) {
    return null;
  }

  return (
    <div className="video-editor">
      {/* Hidden video element for frame extraction */}
      <video
        ref={videoRef}
        src={videoBlobUrl || undefined}
        onLoadedData={handleVideoLoaded}
        preload="auto"
        style={{ display: 'none' }}
      />

      {/* Tab Navigation */}
      <div className="editor-tabs" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
          <button
            className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'preview' ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'preview' ? '2px solid #667eea' : '2px solid transparent',
              color: activeTab === 'preview' ? '#e0e0f0' : '#a0a0c0',
              cursor: 'pointer',
              fontWeight: activeTab === 'preview' ? '600' : '400',
              transition: 'all 0.2s',
            }}
          >
            📺 Preview
          </button>
          <button
            className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'timeline' ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'timeline' ? '2px solid #667eea' : '2px solid transparent',
              color: activeTab === 'timeline' ? '#e0e0f0' : '#a0a0c0',
              cursor: 'pointer',
              fontWeight: activeTab === 'timeline' ? '600' : '400',
              transition: 'all 0.2s',
            }}
          >
            ✂️ Timeline
          </button>
          <button
            className={`tab-button ${activeTab === 'crop' ? 'active' : ''}`}
            onClick={() => setActiveTab('crop')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'crop' ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'crop' ? '2px solid #667eea' : '2px solid transparent',
              color: activeTab === 'crop' ? '#e0e0f0' : '#a0a0c0',
              cursor: 'pointer',
              fontWeight: activeTab === 'crop' ? '600' : '400',
              transition: 'all 0.2s',
            }}
          >
            🖼️ Crop
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'preview' && (
          <div className="preview-tab">
            {isLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                <p>Loading video...</p>
              </div>
            ) : (
              <>
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Sample Frames</h3>
                {sampleFrames.length > 0 ? (
                  <div className="frames-grid">
                    {sampleFrames.map((frame, index) => (
                      <div key={index} className="frame-item">
                        <img src={frame} alt={`Frame ${index + 1}`} className="frame-image" />
                        <span className="frame-label">
                          {index === 0 && 'Start'}
                          {index === 1 && 'Middle'}
                          {index === 2 && 'End'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                    <p>Generating frames...</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'timeline' && <TimelineEditor />}

        {activeTab === 'crop' && (
          <CropEditor previewImage={sampleFrames[1] || sampleFrames[0] || ''} />
        )}
      </div>
    </div>
  );
};

export default VideoEditor;

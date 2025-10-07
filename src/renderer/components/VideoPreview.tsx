import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';

const VideoPreview: React.FC = () => {
  const {
    videoFile,
    videoInfo,
    setVideoElement,
    setCropArea,
    options,
  } = useStore();

  const videoRef = useRef<HTMLVideoElement>(null);
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
    console.log('=== VideoPreview Render ===');
    console.log('videoFile:', videoFile);
    console.log('videoInfo:', videoInfo);
    console.log('sampleFrames count:', sampleFrames.length);
    console.log('isLoading:', isLoading);
  }, [videoFile, videoInfo, sampleFrames, isLoading]);

  // Load video as blob
  useEffect(() => {
    if (!videoFile) return;

    let objectUrl: string | null = null;

    const loadVideo = async () => {
      try {
        console.log('Reading video file:', videoFile);
        const buffer = await window.electronAPI.readVideoFile(videoFile);
        console.log('Video buffer size:', buffer.byteLength);

        const blob = new Blob([buffer], { type: 'video/mp4' });
        objectUrl = URL.createObjectURL(blob);
        console.log('Video blob URL created:', objectUrl);
        setVideoBlobUrl(objectUrl);
      } catch (error) {
        console.error('Error creating video blob:', error);
      }
    };

    loadVideo();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setVideoBlobUrl(null);
      }
    };
  }, [videoFile]);

  if (!videoFile) {
    console.log('No video file - not rendering preview');
    return null;
  }

  if (!videoBlobUrl) {
    return (
      <div className="video-preview-container">
        <div className="loading-frames">⏳ Loading video...</div>
      </div>
    );
  }

  console.log('Rendering video with blob URL:', videoBlobUrl);

  return (
    <div className="video-preview-container">
      {/* Hidden video element for frame extraction */}
      <video
        ref={videoRef}
        src={videoBlobUrl}
        style={{ display: 'none' }}
        preload="auto"
        onLoadedData={handleVideoLoaded}
        onError={(e) => {
          console.error('Video element error:', e);
          console.error('Video error details:', videoRef.current?.error);
        }}
        onCanPlay={() => console.log('Video can play')}
        onLoadStart={() => console.log('Video load started')}
      />

      <div className="sample-frames">
        <h4>Sample Frames</h4>
        <div className="frames-grid">
          {sampleFrames.map((frame, index) => (
            <div key={index} className="sample-frame">
              <img src={frame} alt={`Frame ${index + 1}`} />
              <span className="frame-label">
                {index === 0 ? 'Start' : index === 1 ? 'Middle' : 'End'}
              </span>
            </div>
          ))}
          {sampleFrames.length === 0 && (
            <div className="loading-frames">
              {isLoading ? '⏳ Loading video...' : '⚠️ Video failed to load - check console'}
            </div>
          )}
        </div>
      </div>

      {videoInfo && (
        <div className="chroma-preview-note">
          <p>
            ✨ Enable chroma key below to remove the background
          </p>
          {options.chromaKey?.enabled && (
            <p style={{ color: '#4caf50', marginTop: '0.5rem' }}>
              ✅ Chroma key active - green edges will be cleaned in final export
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoPreview;

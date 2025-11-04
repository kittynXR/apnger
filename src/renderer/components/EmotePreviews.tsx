import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { EMOTE_SPECS } from '../../shared/types';

const EmotePreviews: React.FC = () => {
  const { videoFile, videoInfo, options } = useStore();

  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Watch specific option values for changes
  const chromaKeyEnabled = options.chromaKey?.enabled;
  const chromaKeyColor = options.chromaKey?.color;
  const chromaKeySimilarity = options.chromaKey?.similarity;
  const chromaKeyBlend = options.chromaKey?.blend;

  const generatePreview = async (platform: string) => {
    if (!videoFile || !videoInfo) return;

    setLoading(prev => ({ ...prev, [platform]: true }));

    try {
      console.log(`Requesting preview for ${platform} from FFmpeg...`);
      const preview = await window.electronAPI.generatePreview(videoFile, platform, options);
      console.log(`Received preview for ${platform}, length: ${preview.length}`);

      setPreviews(prev => ({ ...prev, [platform]: preview }));
    } catch (error) {
      console.error(`Failed to generate preview for ${platform}:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

  const generateAllPreviews = async () => {
    if (!videoFile || !videoInfo) return;

    console.log('Generating all previews using FFmpeg...');

    // Generate all previews in parallel
    await Promise.all(
      Object.keys(EMOTE_SPECS).map(platform => generatePreview(platform))
    );
  };

  // Auto-generate on load and when settings change
  useEffect(() => {
    if (!videoFile || !videoInfo) return;

    console.log('Options changed, regenerating previews...');
    generateAllPreviews();
  }, [videoFile, videoInfo, chromaKeyEnabled, chromaKeyColor, chromaKeySimilarity, chromaKeyBlend]);

  const formatFileSize = (bytes: number): string => {
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const getPlatformColor = (platform: string): string => {
    const colors: Record<string, string> = {
      twitch: '#9146ff',
      'discord-sticker': '#5865f2',
      'discord-emote': '#404eed',
      '7tv': '#00d05f',
      'vrc-spritesheet': '#1f8dd6',
    };
    return colors[platform] || '#667eea';
  };

  if (!videoFile || !videoInfo) {
    return (
      <div className="emote-previews">
        <div className="preview-placeholder">
          <p>Load a video to see emote previews</p>
        </div>
      </div>
    );
  }

  return (
    <div className="emote-previews">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>Emote Previews</h3>
          <p className="preview-description" style={{ margin: '0.25rem 0 0 0' }}>
            Actual FFmpeg output preview
          </p>
        </div>
        <button
          className="button button-secondary"
          onClick={generateAllPreviews}
          disabled={!videoFile || !videoInfo}
        >
          🔄 Regenerate
        </button>
      </div>
      <div className="preview-grid">
        {Object.entries(EMOTE_SPECS).map(([platform, spec]) => {
          const thumbnail = previews[platform];
          const isLoading = loading[platform];
          const platformColor = getPlatformColor(platform);

          return (
            <div
              key={platform}
              className="preview-card"
              style={{
                borderColor: thumbnail ? platformColor : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="preview-header">
                <h4>{spec.name}</h4>
                <span className="preview-dimensions">
                  {spec.width}×{spec.height}
                </span>
              </div>

              <div className="preview-thumbnail">
                {isLoading ? (
                  <div className="preview-loading">⏳</div>
                ) : thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={spec.name}
                    className="preview-image"
                    onLoad={() => {
                      console.log(`${platform} image displayed successfully`);
                    }}
                    onError={() => {
                      console.error(`${platform} image failed to display`);
                    }}
                  />
                ) : (
                  <div className="preview-loading">⏳</div>
                )}
              </div>

              <div className="preview-info">
                <div className="preview-stat">
                  <span className="stat-label">Max Size:</span>
                  <span className="stat-value">{formatFileSize(spec.maxSize)}</span>
                </div>
                {spec.maxFrames && (
                  <div className="preview-stat">
                    <span className="stat-label">Max Frames:</span>
                    <span className="stat-value">{spec.maxFrames}</span>
                  </div>
                )}
                <div className="preview-stat">
                  <span className="stat-label">Format:</span>
                  <span className="stat-value">{spec.format.toUpperCase()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmotePreviews;

import React, { useState, useCallback, useEffect } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { useStore } from '../store';

const CROP_PRESETS = [
  { name: 'square', aspectRatio: 1, label: 'Square (1:1)' },
  { name: '9:16', aspectRatio: 9 / 16, label: 'Phone (9:16)' },
  { name: '16:9', aspectRatio: 16 / 9, label: 'Widescreen (16:9)' },
  { name: '4:3', aspectRatio: 4 / 3, label: 'Standard (4:3)' },
  { name: '4:5', aspectRatio: 4 / 5, label: 'Portrait (4:5)' },
  { name: 'free', aspectRatio: 0, label: 'Free Aspect' },
];

interface CropEditorProps {
  previewImage: string;
}

const CropEditor: React.FC<CropEditorProps> = ({ previewImage }) => {
  const {
    videoInfo,
    cropArea,
    cropPreset,
    cropLocked,
    setCropArea,
    setCropPreset,
    setCropLocked,
    applyCropPreset,
  } = useStore();

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(1); // Default to square

  // Initialize aspect ratio from stored preset on mount
  useEffect(() => {
    if (cropPreset) {
      const preset = CROP_PRESETS.find(p => p.name === cropPreset);
      if (preset) {
        if (preset.aspectRatio === 0) {
          setAspect(undefined);
        } else {
          setAspect(preset.aspectRatio);
        }
      }
    } else {
      // Default to square if no preset selected
      setAspect(1);
      setCropPreset('square');
      applyCropPreset(1);
    }
  }, [cropPreset, setCropPreset, applyCropPreset]); // Only run on mount or when deps change

  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      // Update crop area in store with pixel coordinates
      setCropArea({
        x: Math.round(croppedAreaPixels.x),
        y: Math.round(croppedAreaPixels.y),
        width: Math.round(croppedAreaPixels.width),
        height: Math.round(croppedAreaPixels.height),
      });
    },
    [setCropArea]
  );

  const handlePresetClick = (preset: typeof CROP_PRESETS[0]) => {
    setCropPreset(preset.name);
    // For free aspect, set to undefined to allow free adjustment
    // For fixed ratios, use the aspectRatio value (0 means free in our case)
    if (preset.aspectRatio === 0) {
      setAspect(undefined);
    } else {
      setAspect(preset.aspectRatio);
    }
    applyCropPreset(preset.aspectRatio === 0 ? null : preset.aspectRatio);
  };

  if (!videoInfo) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
        <p>Load a video to use the crop editor</p>
      </div>
    );
  }

  return (
    <div className="crop-editor">
      <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Crop Video</h3>

      {/* Preset Buttons */}
      <div className="crop-presets" style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0a0c0' }}>
          Quick Presets:
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {CROP_PRESETS.map((preset) => (
            <button
              key={preset.name}
              className={`button ${
                cropPreset === preset.name ? 'button-primary' : 'button-secondary'
              }`}
              onClick={() => handlePresetClick(preset)}
              style={{ flex: '0 0 auto' }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Cropper */}
      <div
        className="cropper-container"
        style={{
          position: 'relative',
          width: '100%',
          height: '400px',
          backgroundColor: '#000',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Cropper
          image={previewImage}
          crop={crop}
          zoom={zoom}
          {...(aspect !== undefined ? { aspect } : {})}
          restrictPosition={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          objectFit="contain"
        />
      </div>

      {/* Zoom Control */}
      <div style={{ marginTop: '1rem' }}>
        <label htmlFor="zoom-slider" style={{ color: '#a0a0c0', marginBottom: '0.5rem', display: 'block' }}>
          Zoom: {zoom.toFixed(2)}x
        </label>
        <input
          id="zoom-slider"
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Crop Info */}
      {cropArea && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            fontSize: '0.9rem',
            color: '#a0a0c0',
          }}
        >
          <strong style={{ color: '#e0e0f0' }}>Crop Region:</strong> {cropArea.width} × {cropArea.height} px at ({cropArea.x}, {cropArea.y})
        </div>
      )}

      {/* Lock Aspect Ratio Toggle */}
      <div className="checkbox-group" style={{ marginTop: '1rem' }}>
        <input
          type="checkbox"
          id="lock-aspect"
          checked={cropLocked}
          onChange={(e) => setCropLocked(e.target.checked)}
        />
        <label htmlFor="lock-aspect" style={{ color: '#e0e0f0' }}>
          Lock aspect ratio
        </label>
      </div>
    </div>
  );
};

export default CropEditor;

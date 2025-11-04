import { create } from 'zustand';
import { VideoInput, ProcessingOptions, ExportResult, ProcessingProgress, CropArea, VideoSegment, CropPreset, EMOTE_SPECS } from '../shared/types';

interface AppState {
  // Video input
  videoFile: string | null;
  videoInfo: VideoInput | null;

  // Output directory
  outputDir: string | null;

  // Processing options
  options: ProcessingOptions;

  // Format selection
  enabledFormats: Set<string>;

  // Timeline editing
  segments: VideoSegment[];
  editMode: 'simple-trim' | 'multi-segment';
  trimRange: {start: number, end: number} | null;

  // Preview & Crop state
  cropArea: CropArea | null;
  cropMode: 'none' | 'square' | 'custom' | 'preset';
  cropPreset: string | null;
  cropLocked: boolean;
  currentVideoTime: number;
  previewThumbnails: Map<string, string>;
  videoElement: HTMLVideoElement | null;

  // Processing state
  isProcessing: boolean;
  progress: Map<string, ProcessingProgress>;
  results: ExportResult[];

  // Actions
  setVideoFile: (file: string | null) => void;
  setVideoInfo: (info: VideoInput | null) => void;
  setOutputDir: (dir: string | null) => void;
  setOptions: (options: ProcessingOptions) => void;
  updateOption: <K extends keyof ProcessingOptions>(key: K, value: ProcessingOptions[K]) => void;
  toggleFormat: (format: string) => void;
  selectAllFormats: () => void;
  selectNoFormats: () => void;

  // Timeline actions
  setEditMode: (mode: 'simple-trim' | 'multi-segment') => void;
  setTrimRange: (range: {start: number, end: number} | null) => void;
  addSegment: (segment: VideoSegment) => void;
  removeSegment: (id: string) => void;
  toggleSegment: (id: string) => void;
  updateSegment: (id: string, updates: Partial<VideoSegment>) => void;

  // Crop actions
  setCropArea: (crop: CropArea | null) => void;
  setCropMode: (mode: 'none' | 'square' | 'custom' | 'preset') => void;
  setCropPreset: (preset: string | null) => void;
  setCropLocked: (locked: boolean) => void;
  applyCropPreset: (aspectRatio: number | null) => void;

  setCurrentVideoTime: (time: number) => void;
  updatePreviewThumbnail: (platform: string, dataUrl: string) => void;
  setVideoElement: (element: HTMLVideoElement | null) => void;
  setIsProcessing: (processing: boolean) => void;
  updateProgress: (progress: ProcessingProgress) => void;
  setResults: (results: ExportResult[]) => void;
  reset: () => void;
}

const defaultOptions: ProcessingOptions = {
  chromaKey: {
    enabled: false,
    color: '#00FF00',
    similarity: 0.3,
    blend: 0.1,
  },
  quality: 'balanced',
  webGifResolution: 'original',
};

export const useStore = create<AppState>((set) => ({
  videoFile: null,
  videoInfo: null,
  outputDir: null,
  options: defaultOptions,
  enabledFormats: new Set(['twitch', 'discord-sticker', 'discord-emote', '7tv', 'vrc-spritesheet', 'web-gif']), // All enabled by default

  // Timeline editing state
  segments: [],
  editMode: 'simple-trim',
  trimRange: null,

  // Crop state
  cropArea: null,
  cropMode: 'none',
  cropPreset: null,
  cropLocked: false,

  currentVideoTime: 0,
  previewThumbnails: new Map(),
  videoElement: null,
  isProcessing: false,
  progress: new Map(),
  results: [],

  setVideoFile: (file) => set({ videoFile: file }),
  setVideoInfo: (info) => set({ videoInfo: info }),
  setOutputDir: (dir) => set({ outputDir: dir }),
  setOptions: (options) => set({ options }),
  updateOption: (key, value) =>
    set((state) => ({
      options: {
        ...state.options,
        [key]: value,
      },
    })),
  toggleFormat: (format) =>
    set((state) => {
      const newFormats = new Set(state.enabledFormats);
      if (newFormats.has(format)) {
        newFormats.delete(format);
      } else {
        newFormats.add(format);
      }
      return { enabledFormats: newFormats };
    }),
  selectAllFormats: () =>
    set({
      enabledFormats: new Set(Object.keys(EMOTE_SPECS)),
    }),
  selectNoFormats: () =>
    set({
      enabledFormats: new Set(),
    }),

  // Timeline actions
  setEditMode: (mode) => set({ editMode: mode }),
  setTrimRange: (range) => set({ trimRange: range }),
  addSegment: (segment) =>
    set((state) => ({
      segments: [...state.segments, segment],
    })),
  removeSegment: (id) =>
    set((state) => ({
      segments: state.segments.filter((s) => s.id !== id),
    })),
  toggleSegment: (id) =>
    set((state) => ({
      segments: state.segments.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      ),
    })),
  updateSegment: (id, updates) =>
    set((state) => ({
      segments: state.segments.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  // Crop actions
  setCropArea: (crop) =>
    set((state) => ({
      cropArea: crop,
      options: {
        ...state.options,
        crop: crop || undefined,
      },
    })),
  setCropMode: (mode) => set({ cropMode: mode }),
  setCropPreset: (preset) => set({ cropPreset: preset }),
  setCropLocked: (locked) => set({ cropLocked: locked }),
  applyCropPreset: (aspectRatio) =>
    set((state) => {
      if (!state.videoInfo) return state;

      const { width, height } = state.videoInfo;
      let cropWidth = width;
      let cropHeight = height;

      if (aspectRatio !== null) {
        // Calculate crop dimensions based on aspect ratio
        if (width / height > aspectRatio) {
          // Video is wider than target aspect ratio
          cropWidth = Math.floor(height * aspectRatio);
          cropHeight = height;
        } else {
          // Video is taller than target aspect ratio
          cropWidth = width;
          cropHeight = Math.floor(width / aspectRatio);
        }
      }

      // Center the crop
      const x = Math.floor((width - cropWidth) / 2);
      const y = Math.floor((height - cropHeight) / 2);

      return {
        cropArea: { x, y, width: cropWidth, height: cropHeight },
        options: {
          ...state.options,
          crop: { x, y, width: cropWidth, height: cropHeight },
        },
      };
    }),
  setCurrentVideoTime: (time) => set({ currentVideoTime: time }),
  updatePreviewThumbnail: (platform, dataUrl) =>
    set((state) => {
      const newThumbnails = new Map(state.previewThumbnails);
      newThumbnails.set(platform, dataUrl);
      return { previewThumbnails: newThumbnails };
    }),
  setVideoElement: (element) => {
    console.log('Store: setVideoElement called with:', element);
    set({ videoElement: element });
  },
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  updateProgress: (progress) =>
    set((state) => {
      const newProgress = new Map(state.progress);
      newProgress.set(progress.format, progress);
      return { progress: newProgress };
    }),
  setResults: (results) => set({ results }),
  reset: () =>
    set({
      videoFile: null,
      videoInfo: null,
      segments: [],
      editMode: 'simple-trim',
      trimRange: null,
      cropArea: null,
      cropMode: 'none',
      cropPreset: null,
      cropLocked: false,
      currentVideoTime: 0,
      previewThumbnails: new Map(),
      videoElement: null,
      progress: new Map(),
      results: [],
      isProcessing: false,
    }),
}));

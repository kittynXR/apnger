import { create } from 'zustand';
import { VideoInput, ProcessingOptions, ExportResult, ProcessingProgress, CropArea } from '../shared/types';

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

  // Preview & Crop state
  cropArea: CropArea | null;
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
  setCropArea: (crop: CropArea | null) => void;
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
};

export const useStore = create<AppState>((set) => ({
  videoFile: null,
  videoInfo: null,
  outputDir: null,
  options: defaultOptions,
  enabledFormats: new Set(['twitch', 'discord-sticker', 'discord-emote', '7tv', 'vrc-spritesheet']), // All enabled by default
  cropArea: null,
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
  setCropArea: (crop) =>
    set((state) => ({
      cropArea: crop,
      options: {
        ...state.options,
        crop: crop || undefined,
      },
    })),
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
      cropArea: null,
      currentVideoTime: 0,
      previewThumbnails: new Map(),
      videoElement: null,
      progress: new Map(),
      results: [],
      isProcessing: false,
    }),
}));

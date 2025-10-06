import { create } from 'zustand';
import { VideoInput, ProcessingOptions, ExportResult, ProcessingProgress } from '../shared/types';

interface AppState {
  // Video input
  videoFile: string | null;
  videoInfo: VideoInput | null;

  // Output directory
  outputDir: string | null;

  // Processing options
  options: ProcessingOptions;

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
      progress: new Map(),
      results: [],
      isProcessing: false,
    }),
}));

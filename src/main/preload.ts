import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { ProcessingOptions, ExportFormat, VideoInput, ExportResult, ProcessingProgress } from '../shared/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  selectVideoFile: () => ipcRenderer.invoke('select-video-file'),
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
  getVideoInfo: (filePath: string): Promise<VideoInput> =>
    ipcRenderer.invoke('get-video-info', filePath),
  readVideoFile: (filePath: string): Promise<Buffer> =>
    ipcRenderer.invoke('read-video-file', filePath),
  generatePreview: (filePath: string, platform: string, options: ProcessingOptions): Promise<string> =>
    ipcRenderer.invoke('generate-preview', filePath, platform, options),
  processVideo: (
    inputPath: string,
    outputDir: string,
    options: ProcessingOptions,
    formats: ExportFormat[]
  ): Promise<ExportResult[]> =>
    ipcRenderer.invoke('process-video', inputPath, outputDir, options, formats),
  onProcessingProgress: (callback: (progress: ProcessingProgress) => void) => {
    ipcRenderer.on('processing-progress', (_, progress) => callback(progress));
  },
  removeProcessingProgressListener: () => {
    ipcRenderer.removeAllListeners('processing-progress');
  },
});

// Type declarations for TypeScript
declare global {
  interface Window {
    electronAPI: {
      getPathForFile: (file: File) => string;
      selectVideoFile: () => Promise<string | null>;
      selectOutputDirectory: () => Promise<string | null>;
      getVideoInfo: (filePath: string) => Promise<VideoInput>;
      readVideoFile: (filePath: string) => Promise<Buffer>;
      generatePreview: (filePath: string, platform: string, options: ProcessingOptions) => Promise<string>;
      processVideo: (
        inputPath: string,
        outputDir: string,
        options: ProcessingOptions,
        formats: ExportFormat[]
      ) => Promise<ExportResult[]>;
      onProcessingProgress: (callback: (progress: ProcessingProgress) => void) => void;
      removeProcessingProgressListener: () => void;
    };
  }
}

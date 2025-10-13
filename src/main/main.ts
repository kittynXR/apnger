import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { VideoProcessor } from '../shared/processor';
import { ProcessingOptions, ExportFormat } from '../shared/types';

// Enable live reload in development
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', '..', 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    });
  } catch (err) {
    console.log('electron-reload not available');
  }
}

// Get FFmpeg paths - check bundled binaries first, then fall back to system PATH
function getFFmpegPaths(): { ffmpeg: string; ffprobe: string } {
  // In production, binaries are in resources/bin
  // app.getAppPath() returns the app.asar location in production
  const resourcesPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '..', '..', 'resources', 'bin')
    : path.join(process.resourcesPath, 'bin');

  const ffmpegPath = path.join(resourcesPath, 'ffmpeg.exe');
  const ffprobePath = path.join(resourcesPath, 'ffprobe.exe');

  // Check if bundled binaries exist
  if (fs.existsSync(ffmpegPath) && fs.existsSync(ffprobePath)) {
    console.log('Using bundled FFmpeg binaries from:', resourcesPath);
    return { ffmpeg: ffmpegPath, ffprobe: ffprobePath };
  }

  // Fall back to system PATH
  console.log('Bundled FFmpeg not found, falling back to system PATH');
  return { ffmpeg: 'ffmpeg', ffprobe: 'ffprobe' };
}

const ffmpegPaths = getFFmpegPaths();
const processor = new VideoProcessor(ffmpegPaths.ffmpeg, ffmpegPaths.ffprobe);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
    title: 'Apnger - Multi-Platform Emote Converter',
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Register custom protocol to serve local video files
  protocol.registerFileProtocol('apnger-video', (request, callback) => {
    const url = request.url.replace('apnger-video://', '');
    const decodedPath = decodeURIComponent(url);
    callback({ path: decodedPath });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

ipcMain.handle('select-video-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'webm', 'mkv', 'flv'] },
      { name: 'All Files', extensions: ['*'] }
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }

  return null;
});

ipcMain.handle('select-output-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }

  return null;
});

ipcMain.handle('get-video-info', async (_, filePath: string) => {
  try {
    return await processor.getVideoInfo(filePath);
  } catch (error) {
    console.error('Error getting video info:', error);
    throw error;
  }
});

ipcMain.handle('read-video-file', async (_, filePath: string) => {
  try {
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(filePath);
    return buffer;
  } catch (error) {
    console.error('Error reading video file:', error);
    throw error;
  }
});

ipcMain.handle('generate-preview', async (_, filePath: string, platform: string, options: ProcessingOptions) => {
  try {
    const videoInfo = await processor.getVideoInfo(filePath);
    const preview = await processor.generatePreview(videoInfo, platform, options);
    return preview;
  } catch (error) {
    console.error(`Error generating preview for ${platform}:`, error);
    throw error;
  }
});

ipcMain.handle(
  'process-video',
  async (
    _,
    inputPath: string,
    outputDir: string,
    options: ProcessingOptions,
    _formats: ExportFormat[]
  ) => {
    try {
      const videoInfo = await processor.getVideoInfo(inputPath);

      const results = await processor.processVideo(
        videoInfo,
        outputDir,
        options,
        (progress) => {
          // Send progress updates to renderer
          mainWindow?.webContents.send('processing-progress', progress);
        }
      );

      return results;
    } catch (error) {
      console.error('Error processing video:', error);
      throw error;
    }
  }
);

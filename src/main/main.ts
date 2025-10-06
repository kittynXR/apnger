import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
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

let mainWindow: BrowserWindow | null = null;
const processor = new VideoProcessor();

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

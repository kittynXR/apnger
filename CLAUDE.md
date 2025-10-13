# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Apnger is a cross-platform desktop application (Electron + React + TypeScript) that converts video files with transparent or chroma-keyed backgrounds into optimized emotes for multiple platforms: Twitch, Discord (stickers and emotes), and 7TV. The application features a GUI with drag-and-drop support, real-time chroma key preview, and one-click export to all formats.

## Architecture

### Tech Stack
- **Desktop Framework**: Electron 38+
- **Frontend**: React 19 + TypeScript 5
- **Build Tool**: Vite 7
- **State Management**: Zustand
- **Video Processing**: FFmpeg 8.0 (bundled native binaries)
- **Bundler**: electron-builder
- **Distribution**: Portable executable with zero external dependencies

### Project Structure

```
apnger/
├── src/
│   ├── main/              # Electron main process
│   │   ├── main.ts        # App entry, window management, IPC handlers, FFmpeg path resolution
│   │   └── preload.ts     # Secure IPC bridge to renderer
│   ├── renderer/          # React frontend
│   │   ├── App.tsx        # Main app component
│   │   ├── main.tsx       # React entry point
│   │   ├── store.ts       # Zustand state management
│   │   ├── App.css        # Global styles
│   │   └── components/    # UI components
│   │       ├── FileInput.tsx           # Video file selection with drag-drop
│   │       ├── ProcessingOptions.tsx   # Chroma key and quality settings
│   │       ├── ProcessButton.tsx       # Export trigger
│   │       ├── ProgressDisplay.tsx     # Real-time processing progress
│   │       └── ResultsDisplay.tsx      # Export results grid
│   └── shared/            # Shared between main and renderer
│       ├── types.ts       # TypeScript interfaces and emote specs
│       └── processor.ts   # Core FFmpeg video processing logic
├── resources/
│   └── bin/               # Bundled FFmpeg binaries (ffmpeg.exe, ffprobe.exe)
├── dist/                  # Build output
├── package.json
├── tsconfig.json          # TypeScript config for renderer
├── tsconfig.main.json     # TypeScript config for main process
├── vite.config.ts         # Vite bundler config
├── electron-builder.yml   # Distribution packaging config (portable exe only)
└── apnger.ps1            # Legacy PowerShell script (deprecated)
```

## Core Processing Pipeline

### Video Input Processing (processor.ts)
1. **Video Info Extraction**: Uses ffprobe to read video metadata (dimensions, FPS, duration)
2. **Chroma Key Removal**: FFmpeg chromakey filter removes specified background color
3. **Multi-Format Export**: Processes video into 4 optimized formats simultaneously
4. **Adaptive Quality**: Adjusts frame rate, palette size, and compression per platform

### Platform-Specific Export Specifications

#### Twitch Animated Emote
- Format: GIF
- Dimensions: 112×112px
- Max Size: 1MB
- Max Frames: 60
- Strategy: Sample frames evenly if source exceeds 60, cap FPS at 30

#### Discord Sticker
- Format: APNG (saved as .png)
- Dimensions: 320×320px (exact)
- Max Size: 512KB
- Strategy: 24 FPS cap, 256 color palette, high compression

#### Discord Animated Emote
- Format: GIF
- Dimensions: 128×128px
- Max Size: 256KB (strict)
- Strategy: 20 FPS cap, 128 color palette, aggressive compression

#### 7TV Emote
- Format: WEBP
- Dimensions: 128×128px
- Max Size: 2MB (generous)
- Strategy: Maintain source FPS, 90% quality, no frame limits

### FFmpeg Filter Chain Construction

The `buildFilterChain` method in processor.ts creates a complex filter pipeline:
1. **Chroma Key**: `chromakey=0x00FF00:similarity:blend` (if enabled)
2. **Scaling**: `scale=W:H:force_original_aspect_ratio=decrease`
3. **Padding**: `pad=W:H:(ow-iw)/2:(oh-ih)/2:color=0x00000000` (transparent)
4. **Frame Selection**: `select='not(mod(n,X))'` for frame sampling (when max frames exceeded)
5. **FPS Control**: `fps=N` or `setpts=N/TB/fps` for precise timing

## Development Commands

### Build & Run
```bash
npm run dev              # Start dev mode (Vite + Electron)
npm run dev:vite         # Start Vite dev server only
npm run dev:electron     # Start Electron only (requires dev:vite running)
npm run build            # Build both renderer and main
npm run build:renderer   # Build React app with Vite
npm run build:main       # Compile TypeScript main process
```

### Distribution
```bash
npm run dist             # Package for current platform
npm run dist:win         # Windows installer (NSIS + portable)
npm run dist:mac         # macOS DMG + ZIP
npm run dist:linux       # AppImage + DEB
```

## IPC Communication

The app uses Electron IPC for secure main↔renderer communication:

**Main Process Handlers** (main/main.ts):
- `select-video-file`: Opens file dialog, returns video path
- `select-output-directory`: Opens directory dialog
- `get-video-info`: Returns VideoInput metadata via ffprobe
- `process-video`: Processes video and returns ExportResult[]

**Renderer API** (main/preload.ts):
- `window.electronAPI.selectVideoFile()`
- `window.electronAPI.getVideoInfo(path)`
- `window.electronAPI.processVideo(path, output, options, formats)`
- `window.electronAPI.onProcessingProgress(callback)` - Listens for progress updates

## State Management

Zustand store (`renderer/store.ts`) manages:
- `videoFile`: Selected video file path
- `videoInfo`: Parsed video metadata (FPS, dimensions, duration)
- `outputDir`: Chosen export directory
- `options`: Processing options (chroma key settings, quality preset)
- `isProcessing`: Boolean processing state
- `progress`: Map<string, ProcessingProgress> for real-time updates
- `results`: ExportResult[] after processing completes

## Key Implementation Details

### Chroma Key Processing
- Uses FFmpeg's `chromakey` filter with configurable color, similarity (0-1), and blend (0-1)
- Similarity controls how many shades of the color to remove
- Blend softens edges for smoother transparency
- Default: green (#00FF00) with 0.3 similarity, 0.1 blend

### Frame Rate Optimization
- Calculates total source frames: `duration * fps`
- If exceeds max frames (e.g., 60 for Twitch), samples evenly: `select='not(mod(n,⌈total/max⌉))'`
- Adjusts presentation timestamp (PTS) to maintain proper playback speed
- Platform-specific FPS caps reduce file size (Twitch: 30, Discord sticker: 24, Discord emote: 20)

### Palette Generation (Two-Pass)
1. **Pass 1**: Generate palette with `palettegen=max_colors=N:stats_mode=diff`
2. **Pass 2**: Apply palette with `paletteuse=dither=bayer:bayer_scale=N`
- Fewer colors = smaller file (Discord emote uses 128, others use 256)
- Bayer dithering balances quality and compression

### Error Handling
- Each format exports independently; failures don't block other formats
- Temporary files stored in `.temp/` subdirectory, cleaned up after processing
- Results array includes success/failure status and error messages per format

## Dependencies

**Runtime**:
- FFmpeg 8.0 and ffprobe are bundled with the application (no external dependencies required)
- Binaries are automatically detected from `resources/bin/` in both development and production
- Falls back to system PATH if bundled binaries are not found

**Development**:
- Node.js 18+
- npm 9+
- FFmpeg binaries must be present in `resources/bin/` for development builds

## Future Enhancements (Not Yet Implemented)

The original plan included a web version using FFmpeg.wasm for browser-based processing. This would enable:
- No installation required (Progressive Web App)
- Embeddable in web pages via iframe
- Client-side processing (privacy-friendly)
- Service worker for offline use

To implement, create a separate build configuration that:
1. Uses FFmpeg.wasm instead of native FFmpeg
2. Replaces Electron IPC with browser File API
3. Builds as static site (Vite output without Electron wrapper)
4. Adjusts quality presets for WASM performance limitations

# 🎨 Apnger

**Multi-Platform Emote Converter**

Convert your videos with greenscreen or transparent backgrounds into optimized emotes for Twitch, Discord, and 7TV with a single click!

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

## ✨ Features

- 🎬 **One-Click Export**: Convert to all 4 formats simultaneously
- 🟢 **Chroma Key Support**: Remove greenscreen, bluescreen, or any color background
- 📐 **Auto-Optimization**: Automatically fits each platform's requirements
- 🎯 **Platform-Specific**: Optimized for Twitch, Discord Stickers, Discord Emotes, and 7TV
- 💨 **Drag & Drop**: Simple drag-and-drop interface
- 🎨 **Visual Color Picker**: Easy background color selection
- 📊 **Real-Time Progress**: Watch the conversion process in real-time
- 💾 **Smart Compression**: Maximum quality within file size limits

## 📋 Supported Output Formats

| Platform | Format | Dimensions | Max Size | Max Frames |
|----------|--------|------------|----------|------------|
| **Twitch** | GIF | 112×112px | 1MB | 60 |
| **Discord Sticker** | APNG | 320×320px | 512KB | Unlimited |
| **Discord Emote** | GIF | 128×128px | 256KB | Unlimited |
| **7TV** | GIF | 128×128px | 3MB | Unlimited |

## 🚀 Quick Start

### Prerequisites

- **FFmpeg** must be installed and available in your system PATH
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg` or equivalent

### Installation

#### Option 1: Download Pre-built Binary
Download the latest release for your platform from the [Releases](https://github.com/kittynXR/apnger/releases) page.

**Windows:**
- `Apnger Setup 1.0.0.exe` - Full installer with shortcuts
- `Apnger 1.0.0.exe` - Portable version (no install)

#### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/kittynXR/apnger.git
cd apnger

# Install dependencies
npm install

# Build the application
npm run build

# Create distributable
npm run dist
```

### Development Mode

```bash
# Start development mode with hot reload
npm run dev
```

## 💡 How to Use

1. **Select Video**
   - Drag and drop a video file, or click to browse
   - Supported formats: MP4, MOV, AVI, WebM, MKV, FLV
   - Choose output directory

2. **Preview**
   - View sample frames from your video
   - See live previews of all 4 emote formats
   - Click "🔄 Regenerate" to refresh previews

3. **Configure Options**
   - Enable chroma key removal for greenscreen/bluescreen videos
   - Use the color picker to select background color
   - Adjust similarity (30% default) to control color removal range
   - Adjust blend (10% default) for smoother edge transparency
   - Live previews update as you adjust settings

4. **Export**
   - Click "🚀 Export All Formats"
   - Watch progress bars for each format
   - Iterative optimization ensures files meet platform size limits
   - Find your emotes in the output directory!

## 🎨 Chroma Key Tips

- **Similarity**: Higher values remove more shades of the selected color (start with 30%)
- **Edge Blend**: Softens edges for smoother transparency (start with 10%)
- **Common Colors**:
  - Green screen: `#00FF00`
  - Blue screen: `#0000FF`
  - Black background: `#000000`

## 🛠️ Quality Presets

- **Maximum Quality**: Highest frame rate and best compression, larger files
- **Balanced** (Recommended): Good quality with reasonable file sizes
- **Smallest File Size**: Aggressive compression, may reduce quality slightly

## 📦 Project Structure

```
apnger/
├── src/
│   ├── main/              # Electron main process
│   ├── renderer/          # React frontend
│   └── shared/            # Shared code (processing logic)
├── dist/                  # Build output
└── release/               # Packaged installers
```

## 🔧 Building Installers

```bash
# Windows (NSIS + Portable)
npm run dist:win

# macOS (DMG + ZIP)
npm run dist:mac

# Linux (AppImage + DEB)
npm run dist:linux
```

## 📝 Technical Details

### Processing Pipeline

1. **Video Analysis**: Extracts metadata (resolution, FPS, duration) using ffprobe
2. **Preview Generation**: FFmpeg generates single-frame previews with all filters applied
3. **Chroma Key Removal**: FFmpeg chromakey filter removes background color
4. **Despill Filter**: Removes color fringing from edges (green/blue halos)
5. **Center Cropping**: Scales to fill then crops to exact dimensions (no padding artifacts)
6. **Frame Optimization**: Samples frames evenly if source exceeds platform limits
7. **Iterative Optimization**: Discord formats loop until under size limits
8. **Palette Generation**: 2-pass process for optimal GIF color quality
9. **Multi-Format Export**: Generates all 4 platform-specific files simultaneously

### FFmpeg Filters Used

- `chromakey`: Background color removal with similarity/blend controls
- `despill`: Removes color spill/fringing from edges
- `eq`: Gamma and saturation correction post-despill
- `scale`: Resize with force_original_aspect_ratio
- `crop`: Exact dimension cropping (replaces pad for cleaner output)
- `fps`: Frame rate control
- `select`: Frame sampling when exceeding max frame limits
- `palettegen`/`paletteuse`: High-quality color quantization for GIFs

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI powered by [React](https://react.dev/)
- Video processing by [FFmpeg](https://ffmpeg.org/)
- State management via [Zustand](https://zustand-demo.pmnd.rs/)

## 📬 Support

- 🐛 [Report a Bug](https://github.com/kittynXR/apnger/issues)
- 💡 [Request a Feature](https://github.com/kittynXR/apnger/issues)
- 📖 [Documentation](https://github.com/kittynXR/apnger/wiki)

## 🎯 Roadmap

- [x] Preview window with real-time chroma key visualization
- [x] Dark mode UI
- [x] FFmpeg-powered accurate previews
- [ ] Draggable crop tool for custom framing
- [ ] Batch processing for multiple videos
- [ ] Custom preset saving
- [ ] Web version (browser-based processing with FFmpeg.wasm)
- [ ] Built-in FFmpeg bundling (no separate install required)
- [ ] Animation trimming/cropping tools
- [ ] Frame-by-frame editor

---

Made with ❤️ for content creators and streamers

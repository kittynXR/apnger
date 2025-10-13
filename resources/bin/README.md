# FFmpeg Binaries

This directory contains FFmpeg static binaries that are bundled with the portable executable.

## Required Files

- `ffmpeg.exe` - FFmpeg video processing tool
- `ffprobe.exe` - FFmpeg media file analyzer

## For Developers

**Download FFmpeg Binaries:**

These binaries are NOT committed to the repository due to GitHub's 100MB file size limit.

To build the application, download the latest FFmpeg essentials build:

```bash
# Option 1: Download from BtbN (GitHub)
curl -L -o ffmpeg.zip "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
unzip ffmpeg.zip
mv ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe resources/bin/
mv ffmpeg-master-latest-win64-gpl/bin/ffprobe.exe resources/bin/
rm -rf ffmpeg-master-latest-win64-gpl ffmpeg.zip
```

Or download manually from: https://github.com/BtbN/FFmpeg-Builds/releases

**Required Version:**
- FFmpeg 8.0 or later
- Windows x64 static build
- GPL licensed

## For End Users

End users downloading the portable executable from GitHub Releases don't need to worry about this - FFmpeg is already bundled inside the `.exe` file!

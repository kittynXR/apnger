import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { VideoInput, ProcessingOptions, ExportResult, EMOTE_SPECS, ProcessingProgress } from './types';

export class VideoProcessor {
  private ffmpegPath: string;
  private ffprobePath: string;

  constructor(ffmpegPath?: string, ffprobePath?: string) {
    // Use provided paths, or fall back to system PATH
    this.ffmpegPath = ffmpegPath || 'ffmpeg';
    this.ffprobePath = ffprobePath || 'ffprobe';
  }

  /**
   * Get video information using ffprobe
   */
  async getVideoInfo(filePath: string): Promise<VideoInput> {
    return new Promise((resolve, reject) => {
      console.log('Getting video info for:', filePath);
      const args = [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,r_frame_rate,duration',
        '-show_entries', 'format=duration',
        '-of', 'json',
        filePath
      ];
      console.log('FFprobe command:', this.ffprobePath, args.join(' '));

      let output = '';
      let errorOutput = '';
      const process = spawn(this.ffprobePath, args);

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', async (code) => {
        if (code !== 0) {
          console.error('FFprobe error:', errorOutput);
          reject(new Error(`Failed to get video info: ${errorOutput || 'Unknown error'}`));
          return;
        }

        try {
          console.log('FFprobe output:', output);
          const info = JSON.parse(output);
          const stream = info.streams[0];
          const format = info.format;

          if (!stream) {
            reject(new Error('No video stream found in file'));
            return;
          }

          // Parse frame rate
          const fpsStr = stream.r_frame_rate.split('/');
          const fps = parseInt(fpsStr[0]) / parseInt(fpsStr[1]);

          // Get file size
          const stats = await fs.stat(filePath);

          const videoInfo = {
            path: filePath,
            name: path.basename(filePath),
            size: stats.size,
            fps: Math.round(fps),
            width: stream.width,
            height: stream.height,
            duration: parseFloat(stream.duration || format.duration || 0),
          };

          console.log('Video info:', videoInfo);
          resolve(videoInfo);
        } catch (error) {
          console.error('Error parsing video info:', error);
          console.error('Raw output was:', output);
          reject(error);
        }
      });

      process.on('error', (err) => {
        console.error('FFprobe process error:', err);
        reject(err);
      });
    });
  }

  /**
   * Generate a single preview frame for a specific platform
   */
  async generatePreview(
    input: VideoInput,
    platform: string,
    options: ProcessingOptions
  ): Promise<string> {
    const spec = EMOTE_SPECS[platform];
    const tempOutput = path.join(os.tmpdir(), `apnger_preview_${platform}_${Date.now()}.png`);

    try {
      // Extract frame at 33% of video duration
      const timestamp = input.duration * 0.33;

      // Build filter chain WITHOUT fps (single frame doesn't need fps filter)
      const filters: string[] = [];

      // Chroma key filter if enabled
      if (options.chromaKey?.enabled) {
        const color = options.chromaKey.color.replace('#', '0x');
        const similarity = options.chromaKey.similarity || 0.3;
        const blend = options.chromaKey.blend || 0.1;

        filters.push(`chromakey=${color}:${similarity}:${blend}`);

        // Despill filter
        const colorLower = options.chromaKey.color.toLowerCase();
        if (colorLower.includes('00ff00') || colorLower.includes('0f0')) {
          filters.push(`despill=type=green:mix=0.5:expand=0`);
        } else if (colorLower.includes('0000ff') || colorLower.includes('00f')) {
          filters.push(`despill=type=blue:mix=0.5:expand=0`);
        }

        filters.push(`eq=gamma=1.1:saturation=1.05`);
      }

      // Apply custom crop if specified
      if (options.crop) {
        filters.push(`crop=${options.crop.width}:${options.crop.height}:${options.crop.x}:${options.crop.y}`);
      }

      // Scale and crop to exact size
      filters.push(`scale=${spec.width}:${spec.height}:force_original_aspect_ratio=increase`);
      filters.push(`crop=${spec.width}:${spec.height}`);

      const filterChain = filters.join(',');

      console.log(`Generating preview for ${platform} at timestamp ${timestamp}s with filters: ${filterChain}`);

      // Generate single frame with FFmpeg
      await this.runFFmpeg([
        '-ss', String(timestamp),
        '-i', input.path,
        '-vf', filterChain,
        '-frames:v', '1',
        '-y', tempOutput
      ]);

      // Read file and convert to base64
      const buffer = await fs.readFile(tempOutput);
      const base64 = buffer.toString('base64');

      // Cleanup
      await fs.unlink(tempOutput);

      console.log(`Preview generated for ${platform}, size: ${base64.length} bytes`);
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error(`Error generating preview for ${platform}:`, error);
      // Cleanup on error
      try {
        await fs.unlink(tempOutput);
      } catch (err) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Process video and export all formats
   * Supports trim (simple start/end) and segments (multiple ranges to merge)
   */
  async processVideo(
    input: VideoInput,
    outputDir: string,
    options: ProcessingOptions,
    onProgress?: (progress: ProcessingProgress) => void,
    enabledFormats?: string[]
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = [];
    const baseName = path.basename(input.name, path.extname(input.name));

    // Create temporary directory for intermediate files
    const tempDir = path.join(outputDir, '.temp');
    await fs.mkdir(tempDir, { recursive: true });

    // Handle segments: If segments are provided, pre-process video to merge them
    if (options.segments && options.segments.length > 0) {
      const enabledSegments = options.segments.filter(s => s.enabled);
      if (enabledSegments.length > 0) {
        console.log(`Pre-processing ${enabledSegments.length} video segments...`);
        // TODO: Implement full segment merging
        // For now, we'll use the first segment as a simple trim
        const firstSegment = enabledSegments[0];
        options.trim = {
          start: firstSegment.startTime,
          end: firstSegment.endTime
        };
      }
    }

    try {
      // Process each format
      for (const [formatKey, spec] of Object.entries(EMOTE_SPECS)) {
        // Skip if format is not enabled
        if (enabledFormats && !enabledFormats.includes(formatKey)) {
          continue;
        }
        onProgress?.({
          format: spec.name,
          stage: 'Processing',
          progress: 0,
        });

        try {
          const outputPath = path.join(outputDir, `${baseName}_${formatKey}.${spec.format === 'apng' ? 'png' : spec.format}`);

          await this.exportFormat(
            input,
            outputPath,
            formatKey,
            options,
            tempDir,
            (progress) => {
              onProgress?.({
                format: spec.name,
                stage: 'Processing',
                progress,
              });
            }
          );

          // For sprite sheets, the file gets renamed to include FPS and frame count
          // We need to find the actual file that was created
          let actualPath = outputPath;
          if (spec.spriteSheet) {
            const dir = path.dirname(outputPath);
            const files = await fs.readdir(dir);
            const targetPattern = `${baseName}_`;
            const matchingFile = files.find(f =>
              f.startsWith(targetPattern) &&
              f.includes('frames') &&
              f.includes('fps') &&
              f.endsWith(`.${spec.format}`)
            );
            if (matchingFile) {
              actualPath = path.join(dir, matchingFile);
            }
          }

          const stats = await fs.stat(actualPath);

          results.push({
            format: spec.name,
            path: actualPath,
            size: stats.size,
            success: true,
          });

          onProgress?.({
            format: spec.name,
            stage: 'Complete',
            progress: 100,
          });
        } catch (error) {
          results.push({
            format: spec.name,
            path: '',
            size: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Cleanup temp directory
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Processing error:', error);
    }

    return results;
  }

  /**
   * Export a specific format
   */
  private async exportFormat(
    input: VideoInput,
    outputPath: string,
    formatKey: string,
    options: ProcessingOptions,
    tempDir: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    switch (formatKey) {
      case 'twitch':
        await this.exportTwitch(input, outputPath, options, tempDir, onProgress);
        break;
      case 'discord-sticker':
        await this.exportDiscordSticker(input, outputPath, options, tempDir, onProgress);
        break;
      case 'discord-emote':
        await this.exportDiscordEmote(input, outputPath, options, tempDir, onProgress);
        break;
      case '7tv':
        await this.export7TV(input, outputPath, options, tempDir, onProgress);
        break;
      case 'vrc-spritesheet':
        await this.exportVRCSpriteSheet(input, outputPath, options, tempDir, onProgress);
        break;
      case 'web-gif':
        await this.exportWebGIF(input, outputPath, options, tempDir, onProgress);
        break;
    }
  }

  /**
   * Build FFmpeg input arguments with optional trim
   */
  private buildInputArgs(inputPath: string, options: ProcessingOptions): string[] {
    const args: string[] = [];

    // Add trim using -ss and -to (input seeking for faster processing)
    if (options.trim) {
      args.push('-ss', String(options.trim.start));
      args.push('-to', String(options.trim.end));
    }

    args.push('-i', inputPath);

    return args;
  }

  /**
   * Build base filter chain for video processing
   */
  private buildFilterChain(
    input: VideoInput,
    targetWidth: number,
    targetHeight: number,
    targetFps: number,
    options: ProcessingOptions,
    maxFrames?: number
  ): string {
    const filters: string[] = [];

    // Chroma key filter if enabled
    if (options.chromaKey?.enabled) {
      const color = options.chromaKey.color.replace('#', '0x');
      const similarity = options.chromaKey.similarity || 0.3;
      const blend = options.chromaKey.blend || 0.1;

      // Apply chroma key
      filters.push(`chromakey=${color}:${similarity}:${blend}`);

      // Remove color spill from edges (fixes green fringing)
      const colorLower = options.chromaKey.color.toLowerCase();
      if (colorLower.includes('00ff00') || colorLower.includes('0f0')) {
        // Green screen - remove green spill
        filters.push(`despill=type=green:mix=0.5:expand=0`);
      } else if (colorLower.includes('0000ff') || colorLower.includes('00f')) {
        // Blue screen - remove blue spill
        filters.push(`despill=type=blue:mix=0.5:expand=0`);
      }

      // Slight color correction to compensate for despill
      filters.push(`eq=gamma=1.1:saturation=1.05`);
    }

    // Apply custom crop if specified
    if (options.crop) {
      filters.push(`crop=${options.crop.width}:${options.crop.height}:${options.crop.x}:${options.crop.y}`);
    }

    // Calculate scaling to fill target dimensions, then crop to exact size
    // This avoids the green/black padding issue
    filters.push(`scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase`);
    filters.push(`crop=${targetWidth}:${targetHeight}`);

    // Frame rate adjustment
    // For videos with more frames than max, we need to calculate the effective fps
    if (maxFrames && input.fps > 0 && input.duration > 0) {
      const totalFrames = Math.floor(input.duration * input.fps);
      if (totalFrames > maxFrames) {
        // Calculate what fps would give us maxFrames over the duration
        // effectiveFps = maxFrames / duration
        const effectiveFps = maxFrames / input.duration;
        // Use the lower of targetFps or effectiveFps to stay under frame limit
        const finalFps = Math.min(targetFps, effectiveFps);
        filters.push(`fps=${finalFps}`);
      } else {
        // Use target fps normally
        filters.push(`fps=${targetFps}`);
      }
    } else {
      filters.push(`fps=${targetFps}`);
    }

    return filters.join(',');
  }

  /**
   * Export Twitch GIF format
   */
  private async exportTwitch(
    input: VideoInput,
    outputPath: string,
    options: ProcessingOptions,
    tempDir: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const spec = EMOTE_SPECS.twitch;
    const palettePath = path.join(tempDir, 'palette_twitch.png');
    const targetFps = Math.min(input.fps, 30); // Cap at 30fps for smaller size

    // Generate palette
    const paletteFilter = this.buildFilterChain(input, spec.width, spec.height, targetFps, options, spec.maxFrames);
    const inputArgs = this.buildInputArgs(input.path, options);
    await this.runFFmpeg([
      ...inputArgs,
      '-vf', `${paletteFilter},palettegen=max_colors=256:stats_mode=diff`,
      '-y', palettePath
    ]);

    onProgress?.(50);

    // Generate GIF with palette
    const gifFilter = this.buildFilterChain(input, spec.width, spec.height, targetFps, options, spec.maxFrames);
    const inputArgs2 = this.buildInputArgs(input.path, options);
    await this.runFFmpeg([
      ...inputArgs2,
      '-i', palettePath,
      '-lavfi', `${gifFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
      '-loop', '0',
      '-y', outputPath
    ]);

    onProgress?.(100);
  }

  /**
   * Export Discord Sticker APNG format with iterative optimization
   */
  private async exportDiscordSticker(
    input: VideoInput,
    outputPath: string,
    options: ProcessingOptions,
    tempDir: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const spec = EMOTE_SPECS['discord-sticker'];
    const maxSize = spec.maxSize;

    // Start with more aggressive settings for Discord's strict 512KB limit
    let fps = Math.min(input.fps, 10);
    let width = spec.width;
    let height = spec.height;
    let colors = 192; // Start lower for better initial compression
    let compressionLevel = 9;

    let attempt = 0;
    const maxAttempts = 15; // More attempts to find optimal settings

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`Discord sticker attempt ${attempt}: ${width}x${height}, ${fps}fps, ${colors} colors`);

      const palettePath = path.join(tempDir, `palette_discord_sticker_${attempt}.png`);

      // Generate palette
      const paletteFilter = this.buildFilterChain(input, width, height, fps, options);
      const inputArgs = this.buildInputArgs(input.path, options);
      await this.runFFmpeg([
        ...inputArgs,
        '-vf', `${paletteFilter},palettegen=max_colors=${colors}`,
        '-y', palettePath
      ]);

      onProgress?.(30 + (attempt * 5));

      // Generate APNG
      const apngFilter = this.buildFilterChain(input, width, height, fps, options);
      const inputArgs2 = this.buildInputArgs(input.path, options);
      await this.runFFmpeg([
        ...inputArgs2,
        '-i', palettePath,
        '-lavfi', `${apngFilter}[x];[x][1:v]paletteuse`,
        '-f', 'apng',
        '-plays', '0',
        '-compression_level', String(compressionLevel),
        '-y', outputPath
      ]);

      // Check file size
      const stats = await fs.stat(outputPath);
      const fileSizeKB = stats.size / 1024;
      console.log(`Discord sticker size: ${fileSizeKB.toFixed(2)} KB (target: ${(maxSize / 1024).toFixed(2)} KB)`);

      if (stats.size <= maxSize) {
        console.log(`Discord sticker optimization successful after ${attempt} attempts`);
        onProgress?.(100);
        return;
      }

      // Reduce settings for next attempt - more aggressive steps
      if (fps > 8) {
        fps -= 2;
      } else if (colors > 96) {
        colors = Math.max(64, colors - 32); // Reduce colors more aggressively
      } else if (fps > 6) {
        fps -= 1;
      } else if (width > 240 || height > 240) {
        width = Math.round(width * 0.88);
        height = Math.round(height * 0.88);
      } else if (colors > 64) {
        colors = 64;
      } else if (fps > 4) {
        fps -= 1;
      } else {
        // Last resort: reduce dimensions more aggressively
        width = Math.round(width * 0.82);
        height = Math.round(height * 0.82);
      }

      // Cleanup palette from failed attempt
      try {
        await fs.unlink(palettePath);
      } catch (err) {
        // Ignore cleanup errors
      }
    }

    // If we exhausted all attempts, throw an error
    throw new Error(`Discord sticker could not be optimized to 512KB limit after ${maxAttempts} attempts. Try a shorter video or lower quality source.`);
  }

  /**
   * Export Discord Emote GIF format with iterative optimization
   */
  private async exportDiscordEmote(
    input: VideoInput,
    outputPath: string,
    options: ProcessingOptions,
    tempDir: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const spec = EMOTE_SPECS['discord-emote'];
    const maxSize = spec.maxSize;

    // Start with very aggressive settings due to strict 256KB limit
    let fps = Math.min(input.fps, 15);
    let width = spec.width;
    let height = spec.height;
    let colors = 128;

    let attempt = 0;
    const maxAttempts = 10;

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`Discord emote attempt ${attempt}: ${width}x${height}, ${fps}fps, ${colors} colors`);

      const palettePath = path.join(tempDir, `palette_discord_emote_${attempt}.png`);

      // Generate palette
      const paletteFilter = this.buildFilterChain(input, width, height, fps, options);
      const inputArgs = this.buildInputArgs(input.path, options);
      await this.runFFmpeg([
        ...inputArgs,
        '-vf', `${paletteFilter},palettegen=max_colors=${colors}:stats_mode=diff`,
        '-y', palettePath
      ]);

      onProgress?.(30 + (attempt * 5));

      // Generate GIF
      const gifFilter = this.buildFilterChain(input, width, height, fps, options);
      const inputArgs2 = this.buildInputArgs(input.path, options);
      await this.runFFmpeg([
        ...inputArgs2,
        '-i', palettePath,
        '-lavfi', `${gifFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=2`,
        '-loop', '0',
        '-y', outputPath
      ]);

      // Check file size
      const stats = await fs.stat(outputPath);
      const fileSizeKB = stats.size / 1024;
      console.log(`Discord emote size: ${fileSizeKB.toFixed(2)} KB (target: ${(maxSize / 1024).toFixed(2)} KB)`);

      if (stats.size <= maxSize) {
        console.log(`Discord emote optimization successful after ${attempt} attempts`);
        onProgress?.(100);
        return;
      }

      // Reduce settings for next attempt
      if (fps > 10) {
        fps -= 2;
      } else if (colors > 64) {
        colors = 64;
      } else if (width > 96 || height > 96) {
        width = Math.round(width * 0.9);
        height = Math.round(height * 0.9);
      } else if (fps > 8) {
        fps -= 1;
      } else {
        // Last resort
        width = Math.round(width * 0.85);
        height = Math.round(height * 0.85);
      }

      // Cleanup palette from failed attempt
      try {
        await fs.unlink(palettePath);
      } catch (err) {
        // Ignore cleanup errors
      }
    }

    console.warn(`Discord emote could not be optimized to target size after ${maxAttempts} attempts`);
    onProgress?.(100);
  }

  /**
   * Export 7TV GIF format (high quality, preserves original FPS)
   */
  private async export7TV(
    input: VideoInput,
    outputPath: string,
    options: ProcessingOptions,
    tempDir: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const spec = EMOTE_SPECS['7tv'];
    const targetFps = input.fps; // Maintain original fps for maximum quality
    const palettePath = path.join(tempDir, 'palette_7tv.png');

    // Generate high-quality palette with more colors
    const paletteFilter = this.buildFilterChain(input, spec.width, spec.height, targetFps, options);
    const inputArgs = this.buildInputArgs(input.path, options);
    await this.runFFmpeg([
      ...inputArgs,
      '-vf', `${paletteFilter},palettegen=max_colors=256:stats_mode=diff`,
      '-y', palettePath
    ]);

    onProgress?.(50);

    // Generate high-quality GIF with better dithering
    const gifFilter = this.buildFilterChain(input, spec.width, spec.height, targetFps, options);
    const inputArgs2 = this.buildInputArgs(input.path, options);
    await this.runFFmpeg([
      ...inputArgs2,
      '-i', palettePath,
      '-lavfi', `${gifFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
      '-loop', '0',
      '-y', outputPath
    ]);

    onProgress?.(100);
  }

  /**
   * Export VRChat Sprite Sheet format (1024×1024 with square frames in uniform grid)
   */
  private async exportVRCSpriteSheet(
    input: VideoInput,
    outputPath: string,
    options: ProcessingOptions,
    tempDir: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const sheetSize = 1024;
    const maxFrames = 64; // VRChat sprite sheet limit

    // Calculate total frames from video
    const sourceTotalFrames = Math.floor(input.duration * input.fps);
    let targetFps = sourceTotalFrames > maxFrames
      ? maxFrames / input.duration  // Reduce FPS to stay under 64 frames
      : input.fps; // Use original FPS if under limit

    // Round targetFps to whole number for cleaner output
    targetFps = Math.round(targetFps);
    const totalFrames = Math.min(sourceTotalFrames, maxFrames);

    // Calculate optimal grid size (find the smallest square that fits all frames)
    const gridSize = Math.ceil(Math.sqrt(totalFrames));
    const frameSize = Math.floor(sheetSize / gridSize);

    console.log(`VRChat Sprite Sheet: ${totalFrames} frames, ${gridSize}×${gridSize} grid, ${frameSize}×${frameSize} per frame`);

    // First, extract individual frames with chroma key and scaling applied
    const framesDir = path.join(tempDir, 'vrc_frames');
    await fs.mkdir(framesDir, { recursive: true });

    // Build filter chain for frame extraction
    const filters: string[] = [];

    // Chroma key filter if enabled
    if (options.chromaKey?.enabled) {
      const color = options.chromaKey.color.replace('#', '0x');
      const similarity = options.chromaKey.similarity || 0.3;
      const blend = options.chromaKey.blend || 0.1;

      filters.push(`chromakey=${color}:${similarity}:${blend}`);

      // Despill filter
      const colorLower = options.chromaKey.color.toLowerCase();
      if (colorLower.includes('00ff00') || colorLower.includes('0f0')) {
        filters.push(`despill=type=green:mix=0.5:expand=0`);
      } else if (colorLower.includes('0000ff') || colorLower.includes('00f')) {
        filters.push(`despill=type=blue:mix=0.5:expand=0`);
      }

      filters.push(`eq=gamma=1.1:saturation=1.05`);
    }

    // Apply custom crop if specified
    if (options.crop) {
      filters.push(`crop=${options.crop.width}:${options.crop.height}:${options.crop.x}:${options.crop.y}`);
    }

    // Scale to frame size while maintaining aspect ratio and crop
    filters.push(`scale=${frameSize}:${frameSize}:force_original_aspect_ratio=increase`);
    filters.push(`crop=${frameSize}:${frameSize}`);

    const filterChain = filters.join(',');

    // Extract frames as individual PNG files
    const framePattern = path.join(framesDir, 'frame_%04d.png');
    const inputArgs = this.buildInputArgs(input.path, options);
    await this.runFFmpeg([
      ...inputArgs,
      '-vf', filterChain,
      '-vsync', '0',
      '-y', framePattern
    ]);

    onProgress?.(50);

    // Now use FFmpeg's tile filter to create the sprite sheet
    // We need to re-read the frames and tile them
    const actualFrames = (await fs.readdir(framesDir)).filter(f => f.endsWith('.png')).length;
    console.log(`Extracted ${actualFrames} frames, creating ${gridSize}×${gridSize} sprite sheet`);

    // Create a complex filter to tile the frames
    // Use FFmpeg's tile filter which arranges frames in a grid
    await this.runFFmpeg([
      '-framerate', String(targetFps),
      '-i', framePattern,
      '-vf', `tile=${gridSize}x${gridSize},scale=${sheetSize}:${sheetSize}`,
      '-frames:v', '1',
      '-y', outputPath
    ]);

    // Rename file to include FPS and frame count in the filename
    // Format: basename_XXframes_XXfps.png
    const dir = path.dirname(outputPath);
    const ext = path.extname(outputPath);
    const basename = path.basename(outputPath, ext);
    const baseParts = basename.split('_');
    // Remove the format suffix if present (e.g., "_7tv-spritesheet")
    const baseNameClean = baseParts.slice(0, -1).join('_');

    const newFilename = `${baseNameClean}_${actualFrames}frames_${targetFps}fps${ext}`;
    const newPath = path.join(dir, newFilename);

    await fs.rename(outputPath, newPath);

    // Update the outputPath reference for the caller
    // Note: We need to return the new path somehow, but the function signature doesn't support it
    // The processVideo method will need to handle this

    console.log(`VRChat Sprite Sheet created: ${newFilename}`);
    onProgress?.(100);
  }

  /**
   * Export Web GIF format (high quality, preserves original FPS and frame count)
   */
  private async exportWebGIF(
    input: VideoInput,
    outputPath: string,
    options: ProcessingOptions,
    tempDir: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    // Calculate target dimensions based on resolution option
    const resolution = options.webGifResolution || 'original';
    let targetWidth = input.width;
    let targetHeight = input.height;

    if (resolution !== 'original') {
      const resolutionMap = {
        '720p': 720,
        '480p': 480,
        '240p': 240,
      };
      const targetRes = resolutionMap[resolution];

      // Scale down to target resolution while maintaining aspect ratio
      if (input.height > targetRes) {
        const aspectRatio = input.width / input.height;
        targetHeight = targetRes;
        targetWidth = Math.floor(targetRes * aspectRatio);
      } else {
        // Video is already smaller than target, keep original
        targetWidth = input.width;
        targetHeight = input.height;
      }
    }

    const targetFps = input.fps; // Preserve original FPS
    const palettePath = path.join(tempDir, 'palette_webgif.png');

    // Build filters (chroma key if enabled, plus optional crop, then scale)
    const filters: string[] = [];

    // Chroma key filter if enabled
    if (options.chromaKey?.enabled) {
      const color = options.chromaKey.color.replace('#', '0x');
      const similarity = options.chromaKey.similarity || 0.3;
      const blend = options.chromaKey.blend || 0.1;

      filters.push(`chromakey=${color}:${similarity}:${blend}`);

      // Despill filter
      const colorLower = options.chromaKey.color.toLowerCase();
      if (colorLower.includes('00ff00') || colorLower.includes('0f0')) {
        filters.push(`despill=type=green:mix=0.5:expand=0`);
      } else if (colorLower.includes('0000ff') || colorLower.includes('00f')) {
        filters.push(`despill=type=blue:mix=0.5:expand=0`);
      }

      filters.push(`eq=gamma=1.1:saturation=1.05`);
    }

    // Apply custom crop if specified
    if (options.crop) {
      filters.push(`crop=${options.crop.width}:${options.crop.height}:${options.crop.x}:${options.crop.y}`);
    }

    // Scale to target resolution if not original
    if (resolution !== 'original') {
      filters.push(`scale=${targetWidth}:${targetHeight}`);
    }

    // Add FPS filter to maintain original frame rate
    filters.push(`fps=${targetFps}`);

    const filterChain = filters.join(',');

    // Generate high-quality palette
    const inputArgs = this.buildInputArgs(input.path, options);
    await this.runFFmpeg([
      ...inputArgs,
      '-vf', `${filterChain},palettegen=max_colors=256:stats_mode=diff`,
      '-y', palettePath
    ]);

    onProgress?.(50);

    // Generate GIF with palette
    const inputArgs2 = this.buildInputArgs(input.path, options);
    await this.runFFmpeg([
      ...inputArgs2,
      '-i', palettePath,
      '-lavfi', `${filterChain}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5`,
      '-loop', '0',
      '-y', outputPath
    ]);

    onProgress?.(100);
  }

  /**
   * Run FFmpeg command
   */
  private runFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, args);
      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFmpeg error: ${stderr}`));
        } else {
          resolve();
        }
      });

      process.on('error', reject);
    });
  }
}

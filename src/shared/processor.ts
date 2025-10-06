import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { VideoInput, ProcessingOptions, ExportResult, EMOTE_SPECS, ProcessingProgress } from './types';

export class VideoProcessor {
  private ffmpegPath: string;
  private ffprobePath: string;

  constructor(ffmpegPath = 'ffmpeg', ffprobePath = 'ffprobe') {
    this.ffmpegPath = ffmpegPath;
    this.ffprobePath = ffprobePath;
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
   * Process video and export all formats
   */
  async processVideo(
    input: VideoInput,
    outputDir: string,
    options: ProcessingOptions,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = [];
    const baseName = path.basename(input.name, path.extname(input.name));

    // Create temporary directory for intermediate files
    const tempDir = path.join(outputDir, '.temp');
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Process each format
      for (const [formatKey, spec] of Object.entries(EMOTE_SPECS)) {
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

          const stats = await fs.stat(outputPath);

          results.push({
            format: spec.name,
            path: outputPath,
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
    }
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
      filters.push(`chromakey=${color}:${similarity}:${blend}`);
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
    if (maxFrames && input.fps > 0) {
      const totalFrames = Math.floor(input.duration * input.fps);
      if (totalFrames > maxFrames) {
        // Sample frames evenly
        const selectExpr = `not(mod(n,${Math.ceil(totalFrames / maxFrames)}))`;
        filters.push(`select='${selectExpr}'`);
        filters.push(`setpts=N/TB/${targetFps}`);
      } else {
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
    await this.runFFmpeg([
      '-i', input.path,
      '-vf', `${paletteFilter},palettegen=max_colors=256:stats_mode=diff`,
      '-y', palettePath
    ]);

    onProgress?.(50);

    // Generate GIF with palette
    const gifFilter = this.buildFilterChain(input, spec.width, spec.height, targetFps, options, spec.maxFrames);
    await this.runFFmpeg([
      '-i', input.path,
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

    // Start with aggressive settings
    let fps = Math.min(input.fps, 12);
    let width = spec.width;
    let height = spec.height;
    let colors = 256;
    let compressionLevel = 9;

    let attempt = 0;
    const maxAttempts = 10;

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`Discord sticker attempt ${attempt}: ${width}x${height}, ${fps}fps, ${colors} colors`);

      const palettePath = path.join(tempDir, `palette_discord_sticker_${attempt}.png`);

      // Generate palette
      const paletteFilter = this.buildFilterChain(input, width, height, fps, options);
      await this.runFFmpeg([
        '-i', input.path,
        '-vf', `${paletteFilter},palettegen=max_colors=${colors}`,
        '-y', palettePath
      ]);

      onProgress?.(30 + (attempt * 5));

      // Generate APNG
      const apngFilter = this.buildFilterChain(input, width, height, fps, options);
      await this.runFFmpeg([
        '-i', input.path,
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

      // Reduce settings for next attempt
      if (fps > 8) {
        fps -= 2;
      } else if (colors > 128) {
        colors = 128;
      } else if (width > 240 || height > 240) {
        width = Math.round(width * 0.9);
        height = Math.round(height * 0.9);
      } else if (fps > 6) {
        fps -= 1;
      } else {
        // Last resort: reduce dimensions more aggressively
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

    console.warn(`Discord sticker could not be optimized to target size after ${maxAttempts} attempts`);
    onProgress?.(100);
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
      await this.runFFmpeg([
        '-i', input.path,
        '-vf', `${paletteFilter},palettegen=max_colors=${colors}:stats_mode=diff`,
        '-y', palettePath
      ]);

      onProgress?.(30 + (attempt * 5));

      // Generate GIF
      const gifFilter = this.buildFilterChain(input, width, height, fps, options);
      await this.runFFmpeg([
        '-i', input.path,
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
    await this.runFFmpeg([
      '-i', input.path,
      '-vf', `${paletteFilter},palettegen=max_colors=256:stats_mode=diff`,
      '-y', palettePath
    ]);

    onProgress?.(50);

    // Generate high-quality GIF with better dithering
    const gifFilter = this.buildFilterChain(input, spec.width, spec.height, targetFps, options);
    await this.runFFmpeg([
      '-i', input.path,
      '-i', palettePath,
      '-lavfi', `${gifFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
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

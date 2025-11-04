export interface VideoInput {
  path: string;
  name: string;
  size: number;
  fps: number;
  width: number;
  height: number;
  duration: number;
}

export interface CropArea {
  x: number;      // pixels from left
  y: number;      // pixels from top
  width: number;  // crop width in pixels
  height: number; // crop height in pixels
}

export interface ProcessingOptions {
  chromaKey?: {
    enabled: boolean;
    color: string; // hex color
    similarity: number; // 0-1
    blend: number; // 0-1
  };
  quality: 'maximum' | 'balanced' | 'smallest';
  crop?: CropArea;
}

export interface ExportFormat {
  name: 'twitch' | 'discord-sticker' | 'discord-emote' | '7tv' | '7tv-spritesheet';
  enabled: boolean;
}

export interface ExportResult {
  format: string;
  path: string;
  size: number;
  success: boolean;
  error?: string;
}

export interface ProcessingProgress {
  format: string;
  stage: string;
  progress: number; // 0-100
}

export interface EmoteSpec {
  name: string;
  format: 'gif' | 'apng' | 'webp' | 'avif' | 'png';
  width: number;
  height: number;
  maxSize: number; // in bytes
  maxFrames?: number;
  description: string;
  allowWide?: boolean; // If true, width can exceed height (for 7TV)
  maxAspectRatio?: number; // Max width:height ratio (e.g., 4 = 4:1)
  spriteSheet?: boolean; // If true, this is a sprite sheet format
}

export const EMOTE_SPECS: Record<string, EmoteSpec> = {
  twitch: {
    name: 'Twitch Animated Emote',
    format: 'gif',
    width: 112,
    height: 112,
    maxSize: 1024 * 1024, // 1MB
    maxFrames: 60,
    description: 'GIF 112×112, max 60 frames, 1MB limit',
  },
  'discord-sticker': {
    name: 'Discord Sticker',
    format: 'apng',
    width: 320,
    height: 320,
    maxSize: 512 * 1024, // 512KB
    description: 'APNG 320×320, 512KB limit',
  },
  'discord-emote': {
    name: 'Discord Animated Emote',
    format: 'gif',
    width: 128,
    height: 128,
    maxSize: 256 * 1024, // 256KB
    description: 'GIF 128×128, 256KB limit',
  },
  '7tv': {
    name: '7TV Emote',
    format: 'gif',
    width: 128,  // Default width (can be wider based on crop)
    height: 128, // Default height
    maxSize: 3 * 1024 * 1024, // 3MB limit (GIFs can be larger)
    description: 'GIF, flexible dimensions, high quality',
    allowWide: true,
    maxAspectRatio: 4, // Allow up to 4:1 width:height ratio
  },
  '7tv-spritesheet': {
    name: '7TV Sprite Sheet',
    format: 'png',
    width: 1024,
    height: 1024,
    maxSize: 10 * 1024 * 1024, // 10MB limit (generous for PNG)
    description: '1024×1024 sprite sheet with square frames, FPS/frame count in filename',
    spriteSheet: true,
  },
};

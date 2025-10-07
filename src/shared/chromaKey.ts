/**
 * Client-side chroma key implementation for canvas previews
 */

export interface ChromaKeyOptions {
  color: string; // hex color like #00FF00
  similarity: number; // 0-1
  blend: number; // 0-1
}

/**
 * Apply chroma key effect to canvas image data
 */
export function applyChromaKeyToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: ChromaKeyOptions
): void {
  console.log('applyChromaKeyToCanvas called with:', { width, height, options });

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Parse target color
  const targetColor = hexToRgb(options.color);
  console.log('Target color parsed:', targetColor);

  if (!targetColor) {
    console.error('Failed to parse target color');
    return;
  }

  const similarity = options.similarity;
  const blend = options.blend;

  let pixelsChanged = 0;
  const samplePixels: Array<{r: number, g: number, b: number, distance: number}> = [];

  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Sample some green pixels for debugging
    if (samplePixels.length < 5 && g > 150 && g > r && g > b) {
      const dist = colorDistance({ r, g, b }, targetColor);
      samplePixels.push({ r, g, b, distance: dist });
    }

    // Calculate color distance
    const distance = colorDistance(
      { r, g, b },
      targetColor
    );

    // Much more generous distance threshold
    const maxDistance = similarity * 600; // Increased threshold

    if (distance < maxDistance) {
      pixelsChanged++;

      // Calculate alpha based on distance
      const blendRange = blend * maxDistance;

      if (distance < maxDistance - blendRange) {
        // Fully transparent
        data[i + 3] = 0;
      } else {
        // Blend edge
        const alpha = ((distance - (maxDistance - blendRange)) / blendRange) * 255;
        data[i + 3] = Math.min(255, alpha);
      }

      // Remove color spill from semi-transparent pixels
      if (data[i + 3] > 0 && data[i + 3] < 255) {
        // Desaturate the key color
        if (targetColor.g > targetColor.r && targetColor.g > targetColor.b) {
          // Green screen - reduce green
          data[i + 1] = Math.min(data[i], data[i + 2]);
        } else if (targetColor.b > targetColor.r && targetColor.b > targetColor.g) {
          // Blue screen - reduce blue
          data[i + 2] = Math.min(data[i], data[i + 1]);
        }
      }
    }
  }

  console.log(`Chroma key processed ${pixelsChanged} pixels out of ${data.length / 4} total`);
  console.log(`Sample green pixels found:`, samplePixels);
  console.log(`Max distance threshold: ${similarity * 600}`);
  ctx.putImageData(imageData, 0, 0);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function colorDistance(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

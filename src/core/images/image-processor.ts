import sharp from 'sharp';
import { AssetFetchError } from '../../utils/errors.js';

export interface ImageProcessingOptions {
  width: number;
  height: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export async function processRasterImage(
  inputBuffer: Buffer,
  options: ImageProcessingOptions = { width: 334, height: 334, fit: 'cover' }
): Promise<Buffer> {
  try {
    const pipeline = sharp(inputBuffer, { failOn: 'truncated' })
      .rotate() // auto-orient based on EXIF
      .resize(options.width, options.height, {
        fit: options.fit ?? 'cover',
        position: 'centre',
      })
      .png({
        compressionLevel: 6,
        adaptiveFiltering: true,
      });

    return await pipeline.toBuffer();
  } catch (err) {
    throw new AssetFetchError(`Failed to process image buffer with Sharp: ${(err as Error).message}`);
  }
}

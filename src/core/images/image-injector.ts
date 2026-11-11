export function bufferToDataUri(buffer: Buffer, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Embeds a raster asset in SVG markup. Use this for PNG emojis and other
 * reusable image assets so every module gets the same data URI and sizing
 * behavior as profile and leaderboard images.
 */
export function buildSvgImageFromBuffer(params: {
  buffer: Buffer;
  mimeType?: string;
  x: number | string;
  y: number | string;
  width: number | string;
  height: number | string;
  preserveAspectRatio?: string;
  clipPathUrl?: string;
}): string {
  const { buffer, mimeType = 'image/png', ...imageOptions } = params;
  return buildSvgImageTag({ dataUri: bufferToDataUri(buffer, mimeType), ...imageOptions });
}

export function buildSvgImageTag(params: {
  dataUri: string;
  x: number | string;
  y: number | string;
  width: number | string;
  height: number | string;
  preserveAspectRatio?: string;
  clipPathUrl?: string;
}): string {
  const {
    dataUri,
    x,
    y,
    width,
    height,
    preserveAspectRatio = 'xMidYMid slice',
    clipPathUrl,
  } = params;

  const clipAttr = clipPathUrl ? ` clip-path="${clipPathUrl}"` : '';
  return `<image href="${dataUri}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="${preserveAspectRatio}"${clipAttr} />`;
}

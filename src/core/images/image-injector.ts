export function bufferToDataUri(buffer: Buffer, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
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

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

export const ALL_RANKS = [
  'ascendant',
  'bronze',
  'diamond',
  'gold',
  'immortal',
  'iron',
  'platinum',
  'radient',
  'silver',
  'unrated',
] as const;

export type RankType = (typeof ALL_RANKS)[number];

export function resolveRanksDirectory(): string {
  const candidates = [
    resolve(process.cwd(), 'assets', 'profile', 'ranks'),
    resolve(process.cwd(), 'assets', 'ranks'),
    resolve(process.cwd(), 'src', 'assets', 'ranks'),
    resolve(process.cwd(), 'dist', 'assets', 'ranks'),
  ];

  for (const dir of candidates) {
    if (existsSync(dir)) {
      return dir;
    }
  }

  return candidates[0]!;
}

export class RankAssetCache {
  private static instance: RankAssetCache | null = null;
  private readonly dataUris = new Map<string, string>();
  private readonly ranksDir: string;
  private initialized = false;

  constructor(ranksDir?: string) {
    this.ranksDir = ranksDir ?? resolveRanksDirectory();
  }

  public static getInstance(ranksDir?: string): RankAssetCache {
    if (!RankAssetCache.instance) {
      RankAssetCache.instance = new RankAssetCache(ranksDir);
    }
    return RankAssetCache.instance;
  }

  public async initialize(targetSize = 60): Promise<void> {
    if (this.initialized) return;

    if (!existsSync(this.ranksDir)) {
      this.initialized = true;
      return;
    }

    const files = readdirSync(this.ranksDir);

    for (const rank of ALL_RANKS) {
      const fileName = files.find(
        (f) => f.toLowerCase() === `${rank}.png` || f.toLowerCase() === `${rank}.svg`
      );

      if (!fileName) continue;

      const fullPath = join(this.ranksDir, fileName);
      try {
        const rawBuffer = readFileSync(fullPath);
        const resizedBuffer = await sharp(rawBuffer)
          .resize(targetSize, targetSize, { fit: 'contain' })
          .png({ compressionLevel: 8 })
          .toBuffer();

        const dataUri = `data:image/png;base64,${resizedBuffer.toString('base64')}`;
        this.dataUris.set(rank, dataUri);
      } catch (err) {
        console.warn(`[RankAssetCache] Warning: could not pre-render rank asset ${rank}:`, err);
      }
    }

    this.initialized = true;
  }

  public getRankDataUri(rankName: string): string | undefined {
    if (!this.initialized) {
      // Synchronous fallback if called before initialize
      const normalized = rankName.toLowerCase().trim();
      return this.dataUris.get(normalized);
    }
    const normalized = rankName.toLowerCase().trim();
    return this.dataUris.get(normalized);
  }

  public has(rankName: string): boolean {
    return this.dataUris.has(rankName.toLowerCase().trim());
  }

  public getAllRanks(): string[] {
    return Array.from(this.dataUris.keys());
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}

export const rankAssetCache = RankAssetCache.getInstance();

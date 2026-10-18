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
  private defaultSize = 80;
  private readonly cachedSizes = new Set<number>();

  constructor(ranksDir?: string) {
    this.ranksDir = ranksDir ?? resolveRanksDirectory();
  }

  public static getInstance(ranksDir?: string): RankAssetCache {
    if (!RankAssetCache.instance) {
      RankAssetCache.instance = new RankAssetCache(ranksDir);
    }
    return RankAssetCache.instance;
  }

  public async initialize(targetSizes: number | number[] = [80, 120]): Promise<void> {
    const sizes = Array.isArray(targetSizes) ? targetSizes : [targetSizes];

    // Determine default size
    if (typeof targetSizes === 'number') {
      this.defaultSize = targetSizes;
    } else if (sizes.includes(80)) {
      this.defaultSize = 80;
    } else {
      this.defaultSize = sizes[0] ?? 80;
    }

    if (!existsSync(this.ranksDir)) {
      this.initialized = true;
      return;
    }

    const sizesToLoad = sizes.filter((s) => !this.cachedSizes.has(s));
    if (this.initialized && sizesToLoad.length === 0) return;

    const files = readdirSync(this.ranksDir);

    for (const size of sizesToLoad) {
      for (const rank of ALL_RANKS) {
        const fileName = files.find(
          (f) => f.toLowerCase() === `${rank}.png`
        );

        if (!fileName) continue;

        const fullPath = join(this.ranksDir, fileName);
        try {
          const rawBuffer = readFileSync(fullPath);
          const resizedBuffer = await sharp(rawBuffer)
            .resize(size, size, {
              fit: 'contain',
              kernel: 'lanczos3',
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png({ compressionLevel: 8 })
            .toBuffer();

          const dataUri = `data:image/png;base64,${resizedBuffer.toString('base64')}`;
          this.dataUris.set(`${rank}_${size}`, dataUri);
          if (size === this.defaultSize) {
            this.dataUris.set(rank, dataUri);
          }
        } catch (err) {
          console.warn(`[RankAssetCache] Warning: could not pre-render rank asset ${rank} at ${size}px:`, err);
        }
      }
      this.cachedSizes.add(size);
    }

    // Ensure base rank keys are set
    for (const rank of ALL_RANKS) {
      if (!this.dataUris.has(rank)) {
        const defaultUri = this.dataUris.get(`${rank}_${this.defaultSize}`);
        if (defaultUri) {
          this.dataUris.set(rank, defaultUri);
        } else {
          for (const s of this.cachedSizes) {
            const uri = this.dataUris.get(`${rank}_${s}`);
            if (uri) {
              this.dataUris.set(rank, uri);
              break;
            }
          }
        }
      }
    }

    this.initialized = true;
  }

  public getRankDataUri(rankName: string, size?: number): string | undefined {
    const normalized = rankName.toLowerCase().trim();
    const key = normalized === 'radiant' ? 'radient' : normalized;

    if (size !== undefined) {
      const sized = this.dataUris.get(`${key}_${size}`) ?? this.dataUris.get(`${normalized}_${size}`);
      if (sized) return sized;
    }

    const defaultSized = this.dataUris.get(`${key}_${this.defaultSize}`) ?? this.dataUris.get(`${normalized}_${this.defaultSize}`);
    if (defaultSized) return defaultSized;

    return this.dataUris.get(key) ?? this.dataUris.get(normalized);
  }

  public has(rankName: string, size?: number): boolean {
    const normalized = rankName.toLowerCase().trim();
    const key = normalized === 'radiant' ? 'radient' : normalized;

    if (size !== undefined) {
      return this.dataUris.has(`${key}_${size}`) || this.dataUris.has(`${normalized}_${size}`);
    }

    return this.dataUris.has(key) || this.dataUris.has(normalized);
  }

  public getAllRanks(): string[] {
    const ranks = new Set<string>();
    for (const k of this.dataUris.keys()) {
      const base = k.split('_')[0]!;
      ranks.add(base);
    }
    return Array.from(ranks);
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}

export const rankAssetCache = RankAssetCache.getInstance();

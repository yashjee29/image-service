import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

export function resolveLeaderboardDirectory(): string {
  const candidates = [
    resolve(process.cwd(), 'assets', 'leaderboard'),
    resolve(process.cwd(), 'src', 'assets', 'leaderboard'),
    resolve(process.cwd(), 'dist', 'assets', 'leaderboard'),
  ];

  for (const dir of candidates) {
    if (existsSync(dir)) {
      return dir;
    }
  }

  return candidates[0]!;
}

export class LeaderboardAssetCache {
  private static instance: LeaderboardAssetCache | null = null;
  private readonly medalDataUris = new Map<string, string>();
  private readonly leaderboardDir: string;
  private initialized = false;
  private defaultSize = 92;
  private readonly cachedSizes = new Set<number>();

  constructor(leaderboardDir?: string) {
    this.leaderboardDir = leaderboardDir ?? resolveLeaderboardDirectory();
  }

  public static getInstance(leaderboardDir?: string): LeaderboardAssetCache {
    if (!LeaderboardAssetCache.instance) {
      LeaderboardAssetCache.instance = new LeaderboardAssetCache(leaderboardDir);
    }
    return LeaderboardAssetCache.instance;
  }

  public async initialize(targetSizes: number | number[] = [92]): Promise<void> {
    const sizes = Array.isArray(targetSizes) ? targetSizes : [targetSizes];
    this.defaultSize = sizes[0] ?? 92;

    if (!existsSync(this.leaderboardDir)) {
      this.initialized = true;
      return;
    }

    const sizesToLoad = sizes.filter((s) => !this.cachedSizes.has(s));
    if (this.initialized && sizesToLoad.length === 0) return;

    for (const size of sizesToLoad) {
      for (let rank = 1; rank <= 3; rank++) {
        const candidates = [`rank_${rank}.png`, `rank-${rank}.png`, `medal-${rank}.png`];
        let fullPath = '';
        for (const c of candidates) {
          const p = join(this.leaderboardDir, c);
          if (existsSync(p)) {
            fullPath = p;
            break;
          }
        }

        if (!fullPath) continue;

        try {
          const rawBuffer = readFileSync(fullPath);
          const resizedBuffer = await sharp(rawBuffer)
            .trim()
            .resize(size, size, {
              fit: 'contain',
              kernel: 'lanczos3',
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png({ compressionLevel: 8 })
            .toBuffer();

          const dataUri = `data:image/png;base64,${resizedBuffer.toString('base64')}`;
          this.medalDataUris.set(`${rank}_${size}`, dataUri);
          this.medalDataUris.set(`${rank}`, dataUri);
        } catch (err) {
          console.warn(`[LeaderboardAssetCache] Warning: could not pre-render rank asset for rank ${rank}:`, err);
        }
      }
      this.cachedSizes.add(size);
    }

    this.initialized = true;
  }

  public getMedalDataUri(rank: number, size = this.defaultSize): string | undefined {
    return this.medalDataUris.get(`${rank}_${size}`) ?? this.medalDataUris.get(`${rank}`);
  }

  public hasMedal(rank: number): boolean {
    return this.medalDataUris.has(`${rank}`);
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}

export const leaderboardAssetCache = LeaderboardAssetCache.getInstance();

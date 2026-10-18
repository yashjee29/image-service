import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rendererConfig } from '../../config/renderer.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

/**
 * The profile cards strictly use Poppins Medium (500), SemiBold (600),
 * Bold (700), and ExtraBold (800). Unused weights (Italics, Thin, Light, Black)
 * are excluded by default to minimize Resvg native fontdb memory footprint.
 */
export const REQUIRED_FONT_REGEX = /Poppins-(Medium|SemiBold|Bold|ExtraBold)\.ttf$/;

export interface FontRegistrySummary {
  count: number;
  fontFiles: string[];
  defaultFontFamily: string;
  loadSystemFonts: boolean;
}

export class FontRegistry {
  private fontFiles: string[] = [];
  private initialized = false;
  private readonly defaultFontFamily = 'Poppins';

  constructor(private readonly fontsDir: string = rendererConfig.fontsDir) {}

  public initialize(): void {
    if (this.initialized) {
      return;
    }

    const isCustomDir = this.fontsDir !== rendererConfig.fontsDir;
    const candidateDirs = isCustomDir
      ? [resolve(this.fontsDir)]
      : [
          resolve(this.fontsDir),
          resolve(process.cwd(), 'assets', 'fonts'),
          resolve(process.cwd(), 'dist', 'assets', 'fonts'),
          resolve(__dirname, '..', '..', '..', 'assets', 'fonts'),
        ];

    let foundDir: string | null = null;
    for (const dir of candidateDirs) {
      if (existsSync(dir)) {
        foundDir = dir;
        break;
      }
    }

    if (!foundDir) {
      this.fontFiles = [];
      this.initialized = true;
      return;
    }

    try {
      const allFiles = readdirSync(foundDir);
      const ttfFiles = allFiles.filter((f) => f.endsWith('.ttf') || f.endsWith('.otf'));

      // First try to load the 4 required weights for optimal memory footprint
      const requiredOnly = ttfFiles
        .filter((file) => REQUIRED_FONT_REGEX.test(file))
        .map((file) => join(foundDir!, file));

      if (requiredOnly.length > 0) {
        this.fontFiles = requiredOnly;
      } else {
        this.fontFiles = ttfFiles.map((file) => join(foundDir!, file));
      }
    } catch {
      this.fontFiles = [];
    }

    this.initialized = true;
  }

  public getFontFiles(): string[] {
    if (!this.initialized) {
      this.initialize();
    }
    return [...this.fontFiles];
  }

  public getDefaultFontFamily(): string {
    return this.defaultFontFamily;
  }

  public getSummary(): FontRegistrySummary {
    if (!this.initialized) {
      this.initialize();
    }
    return {
      count: this.fontFiles.length,
      fontFiles: [...this.fontFiles],
      defaultFontFamily: this.defaultFontFamily,
      loadSystemFonts: false,
    };
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}

export const fontRegistry = new FontRegistry();

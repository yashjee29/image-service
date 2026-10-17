import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { rendererConfig } from '../../config/renderer.config.js';

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

    const resolvedDir = resolve(this.fontsDir);
    if (!existsSync(resolvedDir)) {
      this.fontFiles = [];
      this.initialized = true;
      return;
    }

    try {
      const files = readdirSync(resolvedDir);
      this.fontFiles = files
        .filter((file) => file.endsWith('.ttf') || file.endsWith('.otf'))
        .map((file) => join(resolvedDir, file));
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

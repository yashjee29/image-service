import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TemplateNotFoundError } from '../../utils/errors.js';
import { computeTemplateVersion } from './template-version.js';

export interface LoadedTemplate {
  readonly id: string;
  readonly path: string;
  readonly content: string;
  readonly version: string;
  readonly loadedAt: number;
}

export class TemplateLoader {
  private static instance: TemplateLoader;
  private readonly cache = new Map<string, LoadedTemplate>();

  public static getInstance(): TemplateLoader {
    if (!TemplateLoader.instance) {
      TemplateLoader.instance = new TemplateLoader();
    }
    return TemplateLoader.instance;
  }

  public load(id: string, filePath: string): LoadedTemplate {
    const existing = this.cache.get(id);
    if (existing) {
      return existing;
    }

    const resolvedPath = resolve(filePath);
    if (!existsSync(resolvedPath)) {
      throw new TemplateNotFoundError(`Template file not found at ${resolvedPath}`);
    }

    const content = readFileSync(resolvedPath, 'utf-8');
    const version = computeTemplateVersion(content);

    const loaded: LoadedTemplate = Object.freeze({
      id,
      path: resolvedPath,
      content,
      version,
      loadedAt: Date.now(),
    });

    this.cache.set(id, loaded);
    return loaded;
  }

  public get(id: string): LoadedTemplate | undefined {
    return this.cache.get(id);
  }

  public has(id: string): boolean {
    return this.cache.has(id);
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const templateLoader = TemplateLoader.getInstance();

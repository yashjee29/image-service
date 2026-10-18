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

export function resolveTemplatePath(id: string, preferredPath: string): string {
  const candidates = [
    resolve(preferredPath),
    resolve(process.cwd(), 'templates', id, 'profile.svg'),
    resolve(process.cwd(), 'templates', id, 'leaderboard.svg'),
    resolve(process.cwd(), 'templates', id, `${id}.svg`),
    resolve(process.cwd(), 'templates', `${id}.svg`),
    resolve(process.cwd(), 'dist', 'templates', id, 'profile.svg'),
    resolve(process.cwd(), 'dist', 'templates', id, 'leaderboard.svg'),
    resolve(process.cwd(), 'dist', 'templates', id, `${id}.svg`),
    resolve(process.cwd(), 'dist', 'templates', `${id}.svg`),
    resolve(process.cwd(), 'assets', 'templates', id, `${id}.svg`),
    resolve(process.cwd(), 'assets', 'templates', `${id}.svg`),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return resolve(preferredPath);
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

    const resolvedPath = resolveTemplatePath(id, filePath);
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

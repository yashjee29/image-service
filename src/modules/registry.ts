import type { ImageModule } from '../core/renderer/renderer.types.js';
import { ModuleNotFoundError, ValidationError } from '../utils/errors.js';

export interface ModuleMetadata {
  id: string;
  version: string;
  description?: string;
  defaultDimensions: {
    width: number;
    height: number;
  };
}

export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private readonly modules = new Map<string, ImageModule<unknown>>();
  private readonly aliases = new Map<string, string>();

  public static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  public register<TInput>(module: ImageModule<TInput>): void {
    if (!module.id || typeof module.id !== 'string') {
      throw new ValidationError('Module registration failed: module id must be a non-empty string');
    }

    if (!module.version || typeof module.version !== 'string') {
      throw new ValidationError(`Module '${module.id}' must have a valid version string`);
    }

    if (this.modules.has(module.id)) {
      throw new ValidationError(`Module with id '${module.id}' is already registered in registry`);
    }

    if (typeof module.validate !== 'function' || typeof module.render !== 'function') {
      throw new ValidationError(`Module '${module.id}' must implement validate() and render() functions`);
    }

    this.modules.set(module.id, module as ImageModule<unknown>);
  }

  public registerAlias(alias: string, targetId: string): void {
    if (!alias || typeof alias !== 'string') {
      throw new ValidationError('Alias registration failed: alias must be a non-empty string');
    }
    this.aliases.set(alias, targetId);
  }

  public get<TInput = unknown>(id: string): ImageModule<TInput> {
    const targetId = this.aliases.get(id) ?? id;
    const mod = this.modules.get(targetId);
    if (!mod) {
      throw new ModuleNotFoundError(id);
    }
    return mod as ImageModule<TInput>;
  }

  public has(id: string): boolean {
    const targetId = this.aliases.get(id) ?? id;
    return this.modules.has(targetId);
  }

  public getAll(): ImageModule<unknown>[] {
    return Array.from(this.modules.values());
  }

  public getMetadataList(): ModuleMetadata[] {
    return this.getAll().map((mod) => ({
      id: mod.id,
      version: mod.version,
      description: mod.description,
      defaultDimensions: mod.defaultDimensions,
    }));
  }

  public clear(): void {
    this.modules.clear();
    this.aliases.clear();
  }
}

export const moduleRegistry = ModuleRegistry.getInstance();

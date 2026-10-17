import { fetchRemoteImage } from '../images/image-fetcher.js';
import { processRasterImage, type ImageProcessingOptions } from '../images/image-processor.js';
import { fontRegistry } from '../fonts/font-registry.js';
import { templateRegistry } from '../templates/template-registry.js';
import { TemplateNotFoundError } from '../../utils/errors.js';
import type { RenderContext, RenderOptions } from './renderer.types.js';

export function createRenderContext(
  moduleId: string,
  options?: RenderOptions,
  measureFn?: <T>(stage: string, fn: () => Promise<T> | T) => Promise<T>
): RenderContext {
  const template = templateRegistry.get(moduleId);
  if (!template) {
    throw new TemplateNotFoundError(`Template for module '${moduleId}' is not loaded in registry`);
  }

  const defaultMeasure = async <T>(_stage: string, fn: () => Promise<T> | T): Promise<T> => {
    return await fn();
  };

  return {
    template,
    fontRegistry,
    options,
    measureStage: measureFn ?? defaultMeasure,
    fetchImage: async (url: string) => fetchRemoteImage(url),
    processImage: async (buf: Buffer, opts?: ImageProcessingOptions) => processRasterImage(buf, opts),
  };
}

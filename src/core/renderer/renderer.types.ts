import type { FontRegistry } from '../fonts/font-registry.js';
import type { ImageProcessingOptions } from '../images/image-processor.js';
import type { LoadedTemplate } from '../templates/template-loader.js';

export interface RenderDimensions {
  width: number;
  height?: number;
  scale?: number;
}

export interface RenderOptions {
  dimensions?: RenderDimensions;
  background?: string;
}

export interface RenderContext {
  readonly template: LoadedTemplate;
  readonly fontRegistry: FontRegistry;
  readonly options?: RenderOptions;
  measureStage<T>(stage: string, fn: () => Promise<T> | T): Promise<T>;
  fetchImage(url: string): Promise<Buffer>;
  processImage(buf: Buffer, opts?: ImageProcessingOptions): Promise<Buffer>;
}

export interface ImageModule<TInput> {
  readonly id: string;
  readonly version: string;
  readonly description?: string;
  readonly defaultDimensions: { width: number; height: number };

  validate(input: unknown): TInput;

  render(input: TInput, context: RenderContext): Promise<Buffer>;
}

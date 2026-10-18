import { Resvg, renderAsync, type ResvgRenderOptions } from '@resvg/resvg-js';
import { fontRegistry } from '../fonts/font-registry.js';
import { validateSvgSecurity } from '../svg/svg-validator.js';
import { SvgRasterizationError } from './renderer.errors.js';

export interface SvgRenderParams {
  svgContent: string;
  width?: number;
  background?: string;
  loadSystemFonts?: boolean;
}

export class SvgRenderer {
  public static renderToPng(params: SvgRenderParams): Buffer {
    const {
      svgContent,
      width = 1200,
      background = 'rgba(0,0,0,0)',
      loadSystemFonts = false,
    } = params;

    // Validate SVG security
    validateSvgSecurity(svgContent);

    try {
      const fontFiles = fontRegistry.getFontFiles();
      const defaultFontFamily = fontRegistry.getDefaultFontFamily();

      const resvgOpts: ResvgRenderOptions = {
        fitTo: {
          mode: 'width',
          value: width,
        },
        background,
        font: {
          fontFiles,
          loadSystemFonts,
          defaultFontFamily,
        },
      };

      const resvg = new Resvg(svgContent, resvgOpts);
      const rendered = resvg.render();
      return rendered.asPng();
    } catch (err) {
      if (err instanceof SvgRasterizationError) throw err;
      throw new SvgRasterizationError((err as Error).message);
    }
  }

  /**
   * Asynchronously rasterizes SVG to PNG Buffer on background worker threads via Rust libuv pool.
   * Prevents blocking Node.js event loop and enables linear multi-core scaling under concurrent requests.
   */
  public static async renderToPngAsync(params: SvgRenderParams): Promise<Buffer> {
    const {
      svgContent,
      width = 1200,
      background = 'rgba(0,0,0,0)',
      loadSystemFonts = false,
    } = params;

    validateSvgSecurity(svgContent);

    try {
      const fontFiles = fontRegistry.getFontFiles();
      const defaultFontFamily = fontRegistry.getDefaultFontFamily();

      const resvgOpts: ResvgRenderOptions = {
        fitTo: {
          mode: 'width',
          value: width,
        },
        background,
        font: {
          fontFiles,
          loadSystemFonts,
          defaultFontFamily,
        },
      };

      const rendered = await renderAsync(svgContent, resvgOpts);
      return rendered.asPng();
    } catch (err) {
      if (err instanceof SvgRasterizationError) throw err;
      throw new SvgRasterizationError((err as Error).message);
    }
  }
}

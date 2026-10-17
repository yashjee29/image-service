import { Resvg, type ResvgRenderOptions } from '@resvg/resvg-js';
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
}

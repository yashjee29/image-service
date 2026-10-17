import { templateLoader, type LoadedTemplate } from './template-loader.js';

export class TemplateRegistry {
  private static instance: TemplateRegistry;
  private readonly registered = new Map<string, string>(); // moduleId -> templatePath

  public static getInstance(): TemplateRegistry {
    if (!TemplateRegistry.instance) {
      TemplateRegistry.instance = new TemplateRegistry();
    }
    return TemplateRegistry.instance;
  }

  public register(moduleId: string, templatePath: string): LoadedTemplate {
    this.registered.set(moduleId, templatePath);
    return templateLoader.load(moduleId, templatePath);
  }

  public get(moduleId: string): LoadedTemplate | undefined {
    return templateLoader.get(moduleId);
  }

  public getAll(): Map<string, LoadedTemplate> {
    const map = new Map<string, LoadedTemplate>();
    for (const [moduleId] of this.registered) {
      const template = templateLoader.get(moduleId);
      if (template) {
        map.set(moduleId, template);
      }
    }
    return map;
  }
}

export const templateRegistry = TemplateRegistry.getInstance();

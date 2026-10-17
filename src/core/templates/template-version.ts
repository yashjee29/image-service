import { sha256 } from '../../utils/buffer-utils.js';

export function computeTemplateVersion(content: string): string {
  return sha256(content).substring(0, 16);
}

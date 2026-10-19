import { describe, it, expect } from 'vitest';
import { escapeXmlText, escapeXmlAttribute, sanitizeDisplayText } from '../../src/core/svg/svg-escaping.js';
import { validateSvgSecurity } from '../../src/core/svg/svg-validator.js';
import { RenderError } from '../../src/utils/errors.js';

describe('SVG Escaping & Security Validation', () => {
  describe('escapeXmlText', () => {
    it('escapes &, <, > characters', () => {
      expect(escapeXmlText('Rock & Roll <music>')).toBe('Rock &amp; Roll &lt;music&gt;');
    });

    it('handles numbers and falsy values gracefully', () => {
      expect(escapeXmlText(123)).toBe('123');
      expect(escapeXmlText('')).toBe('');
      expect(escapeXmlText(null)).toBe('');
      expect(escapeXmlText(undefined)).toBe('');
    });
  });

  describe('escapeXmlAttribute', () => {
    it('escapes quotes in addition to xml entities', () => {
      expect(escapeXmlAttribute('Hello "World" & \'Team\'')).toBe(
        'Hello &quot;World&quot; &amp; &apos;Team&apos;'
      );
    });
  });

  describe('sanitizeDisplayText', () => {
    it('strips pictographic emojis like beer and eye', () => {
      expect(sanitizeDisplayText('chivas🍻👁️', 'User')).toBe('chivas');
      expect(sanitizeDisplayText('chivas🍻', 'User')).toBe('chivas');
      expect(sanitizeDisplayText('🔥fire🔥', 'User')).toBe('fire');
    });

    it('normalizes fancy unicode mathematical fonts into standard text', () => {
      expect(sanitizeDisplayText('𝕔𝕙𝕚𝕧𝕒𝕤', 'User')).toBe('chivas');
      expect(sanitizeDisplayText('𝐜𝐡𝐢𝐯𝐚𝐬', 'User')).toBe('chivas');
      expect(sanitizeDisplayText('𝑐ℎ𝑖𝑣𝑎𝑠', 'User')).toBe('chivas');
    });

    it('preserves alphanumeric text, numbers, and symbols like hashtags', () => {
      expect(sanitizeDisplayText('Player#1234', 'User')).toBe('Player#1234');
      expect(sanitizeDisplayText('User_Name-99', 'User')).toBe('User_Name-99');
    });

    it('falls back to default fallback if string becomes empty after stripping emojis', () => {
      expect(sanitizeDisplayText('🍻👁️🔥', 'User')).toBe('User');
      expect(sanitizeDisplayText('', 'Fallback')).toBe('Fallback');
      expect(sanitizeDisplayText(undefined, 'User')).toBe('User');
    });
  });

  describe('validateSvgSecurity', () => {
    it('passes for clean SVG markup', () => {
      const clean = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>';
      expect(() => validateSvgSecurity(clean)).not.toThrow();
    });

    it('rejects script tags', () => {
      const malicious = '<svg><script>alert(1)</script></svg>';
      expect(() => validateSvgSecurity(malicious)).toThrow(RenderError);
    });

    it('rejects inline event handlers', () => {
      const malicious = '<svg><rect width="100" height="100" onload="alert(1)" /></svg>';
      expect(() => validateSvgSecurity(malicious)).toThrow(RenderError);
    });

    it('rejects XXE entity definitions', () => {
      const xxe = '<!DOCTYPE svg [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]><svg>&xxe;</svg>';
      expect(() => validateSvgSecurity(xxe)).toThrow(RenderError);
    });

    it('rejects javascript: urls', () => {
      const malicious = '<svg><a href="javascript:alert(1)"><text>Click</text></a></svg>';
      expect(() => validateSvgSecurity(malicious)).toThrow(RenderError);
    });

    it('rejects SVGs without root svg tags', () => {
      expect(() => validateSvgSecurity('<div class="box"></div>')).toThrow(RenderError);
    });
  });
});

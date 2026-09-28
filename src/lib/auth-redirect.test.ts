import { describe, expect, it } from 'vitest';
import { safeAuthNext } from './auth-redirect';

describe('safeAuthNext', () => {
  it('allows only a path in the active locale', () => {
    expect(safeAuthNext('en', '/en/orders/123?tab=history')).toBe(
      '/en/orders/123?tab=history',
    );
    expect(safeAuthNext('en', '/ar/admin')).toBe('/en/account');
  });
  it('rejects protocol-relative and backslash redirects', () => {
    for (const candidate of [
      '//evil.example',
      '/\\evil.example',
      'https://evil.example',
      '/en/\\evil.example',
    ])
      expect(safeAuthNext('en', candidate)).toBe('/en/account');
  });
});

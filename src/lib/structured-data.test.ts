import { expect, test } from 'vitest';
import { serializeJsonLd } from './structured-data';

test('JSON-LD cannot close its script tag with database content', () => {
  const value = '</script><script>alert(1)</script>\u2028&';
  const serialized = serializeJsonLd({ name: value });
  expect(serialized).not.toContain('<');
  expect(serialized).not.toContain('&');
  expect(serialized).not.toContain('\u2028');
  expect(JSON.parse(serialized)).toEqual({ name: value });
});

import { describe, expect, it } from 'vitest';
import { CATALOG_IMAGE_LIMIT, validateImageFile } from './image-upload';

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);

describe('validateImageFile', () => {
  it('accepts a matching image extension, MIME and signature', async () => {
    const file = new File([jpeg], 'image.jpeg', { type: 'image/jpeg' });
    expect(await validateImageFile(file, CATALOG_IMAGE_LIMIT)).toMatchObject({
      file,
      mime: 'image/jpeg',
      extension: 'jpg',
    });
  });

  it('rejects MIME spoofing and disallowed extensions', async () => {
    const forged = new File(['<svg onload=alert(1)>'], 'image.jpg', {
      type: 'image/jpeg',
    });
    const wrongExtension = new File([jpeg], 'image.svg', {
      type: 'image/jpeg',
    });
    expect(await validateImageFile(forged, CATALOG_IMAGE_LIMIT)).toBeNull();
    expect(
      await validateImageFile(wrongExtension, CATALOG_IMAGE_LIMIT),
    ).toBeNull();
  });

  it('rejects oversize images', async () => {
    const file = new File([jpeg], 'image.jpg', { type: 'image/jpeg' });
    expect(await validateImageFile(file, 11)).toBeNull();
  });
});

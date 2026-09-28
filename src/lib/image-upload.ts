export const IMAGE_MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type AllowedImageMime = keyof typeof IMAGE_MIME_EXTENSIONS;

export const CATALOG_IMAGE_LIMIT = 8 * 1024 * 1024;
export const EVIDENCE_IMAGE_LIMIT = 5 * 1024 * 1024;

export async function validateImageFile(
  value: FormDataEntryValue | null,
  limit: number,
): Promise<{ file: File; mime: AllowedImageMime; extension: string } | null> {
  if (!(value instanceof File) || value.size < 1 || value.size > limit)
    return null;
  const mime = value.type as AllowedImageMime;
  const extension = IMAGE_MIME_EXTENSIONS[mime];
  if (!extension) return null;
  const fileExtension = value.name.split('.').pop()?.toLowerCase();
  if (
    !fileExtension ||
    !(
      fileExtension === extension ||
      (mime === 'image/jpeg' && fileExtension === 'jpeg')
    )
  )
    return null;
  const header = new Uint8Array(await value.slice(0, 12).arrayBuffer());
  const valid =
    (mime === 'image/jpeg' &&
      header[0] === 0xff &&
      header[1] === 0xd8 &&
      header[2] === 0xff) ||
    (mime === 'image/png' &&
      [137, 80, 78, 71, 13, 10, 26, 10].every(
        (byte, index) => header[index] === byte,
      )) ||
    (mime === 'image/webp' &&
      String.fromCharCode(...header.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...header.slice(8, 12)) === 'WEBP');
  return valid ? { file: value, mime, extension } : null;
}

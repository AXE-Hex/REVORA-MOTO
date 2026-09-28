export function siteUrl(path: string) {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  let origin: string;
  try {
    origin = new URL(configured).origin;
  } catch {
    origin = 'http://localhost:3000';
  }
  return new URL(path, origin).toString();
}

export function absoluteMediaUrl(url: string | null) {
  if (!url) return undefined;
  try {
    const resolved = new URL(url, siteUrl('/'));
    return ['http:', 'https:'].includes(resolved.protocol)
      ? resolved.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function detailBreadcrumbs(
  locale: string,
  section: 'shop' | 'motorcycles',
  slug: string,
  name: string,
) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'REVORA MOTO',
        item: siteUrl(`/${locale}`),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: section === 'shop' ? 'Shop' : 'Motorcycles',
        item: siteUrl(`/${locale}/${section}`),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name,
        item: siteUrl(`/${locale}/${section}/${encodeURIComponent(slug)}`),
      },
    ],
  };
}

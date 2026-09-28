import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase/server';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  ).replace(/\/$/, '');
  const paths = [
    '',
    'motorcycles',
    'motorcycles/new',
    'motorcycles/used',
    'shop',
    'brands',
    'fitment',
    'about',
    'contact',
    'faq',
  ];
  const urls: MetadataRoute.Sitemap = paths.flatMap((path) =>
    ['ar', 'en'].map((locale) => ({
      url: `${base}/${locale}${path ? `/${path}` : ''}`,
      changeFrequency: 'weekly' as const,
      priority: path ? 0.7 : 1,
      alternates: {
        languages: {
          ar: `${base}/ar${path ? `/${path}` : ''}`,
          en: `${base}/en${path ? `/${path}` : ''}`,
        },
      },
    })),
  );
  const db = await supabase();
  if (db) {
    const [{ data: bikes }, { data: gear }] = await Promise.all([
      db.from('public_motorcycles').select('slug'),
      db.from('public_products').select('slug'),
    ]);
    for (const b of bikes || [])
      for (const locale of ['ar', 'en'])
        urls.push({
          url: `${base}/${locale}/motorcycles/${b.slug}`,
          changeFrequency: 'weekly',
          priority: 0.8,
        });
    for (const p of gear || [])
      for (const locale of ['ar', 'en'])
        urls.push({
          url: `${base}/${locale}/shop/${p.slug}`,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
  }
  return urls;
}

import { NextRequest, NextResponse } from 'next/server';
import { productListing, motorcycleListing } from '@/lib/catalog';
import { supabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, 80);
  if (q.length < 2) {
    const db = await supabase();
    const { data } = db ? await db.rpc('popular_search_terms') : { data: [] };
    return NextResponse.json(
      { suggestions: [], popular: data || [] },
      {
        headers: { 'Cache-Control': 'private, no-store' },
      },
    );
  }
  const [products, motorcycles] = await Promise.all([
    productListing({ q, limit: 4 }),
    motorcycleListing({ q, limit: 4 }),
  ]);
  const suggestions = [
    ...products.items.map((item) => ({
      kind: 'product',
      slug: item.slug,
      name_ar: item.name_ar,
      name_en: item.name_en,
    })),
    ...motorcycles.items.map((item) => ({
      kind: 'motorcycle',
      slug: item.slug,
      name_ar: item.name_ar,
      name_en: item.name_en,
    })),
  ];
  return NextResponse.json(
    { suggestions, popular: [] },
    {
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}

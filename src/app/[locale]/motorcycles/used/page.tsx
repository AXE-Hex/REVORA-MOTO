import MotorcyclesPage from '../page';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    q?: string;
    min?: string;
    max?: string;
    cc_min?: string;
    cc_max?: string;
    year?: string;
    availability?: string;
    sort?: string;
  }>;
}) {
  const query = await searchParams;
  return MotorcyclesPage({
    params,
    searchParams: Promise.resolve({ ...query, condition: 'used' }),
  });
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';

type Customer = {
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  joined_at: string;
  order_count: number;
  reservation_count: number;
};

export default async function AdminCustomers({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || !(await currentUser())) notFound();
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'customers.read',
  });
  if (!allowed) notFound();
  const query = await searchParams;
  const q = (query.q || '').trim().slice(0, 100);
  const page = Math.max(
    1,
    Math.min(201, Number.parseInt(query.page || '1', 10) || 1),
  );
  const { data, error } = await db!.rpc('admin_customer_directory', {
    p_query: q,
    p_offset: (page - 1) * 50,
  });
  const customers = (data || []) as Customer[];
  const href = (nextPage: number) =>
    `/${locale}/admin/customers?${new URLSearchParams({ q, page: String(nextPage) })}`;
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / CUSTOMERS
      </div>
      <h1 className="page-title">{pick(locale, 'العملاء', 'CUSTOMERS')}</h1>
      <form className="toolbar" method="get">
        <input
          className="input"
          name="q"
          defaultValue={q}
          maxLength={100}
          placeholder={pick(
            locale,
            'ابحث بالاسم أو البريد',
            'Search name or email',
          )}
        />
        <button className="button button-accent" type="submit">
          {pick(locale, 'بحث', 'SEARCH')}
        </button>
      </form>
      {error && (
        <p className="notice error">
          {pick(locale, 'تعذر تحميل العملاء', 'Could not load customers')}
        </p>
      )}
      <div className="panel" style={{ overflowX: 'auto', marginTop: 20 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{pick(locale, 'الاسم', 'NAME')}</th>
              <th>{pick(locale, 'البريد', 'EMAIL')}</th>
              <th>{pick(locale, 'الهاتف', 'PHONE')}</th>
              <th>{pick(locale, 'الطلبات', 'ORDERS')}</th>
              <th>{pick(locale, 'الحجوزات', 'RESERVATIONS')}</th>
              <th>{pick(locale, 'تاريخ التسجيل', 'JOINED')}</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.user_id}>
                <td>{customer.full_name || '—'}</td>
                <td>{customer.email}</td>
                <td>{customer.phone || '—'}</td>
                <td>{customer.order_count}</td>
                <td>{customer.reservation_count}</td>
                <td>
                  {new Date(customer.joined_at).toLocaleDateString(
                    locale === 'ar' ? 'ar-EG' : 'en-GB',
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!customers.length && !error && (
          <p>{pick(locale, 'لا يوجد عملاء', 'No customers')}</p>
        )}
      </div>
      <div className="toolbar" style={{ marginTop: 20 }}>
        {page > 1 && (
          <Link className="button button-ghost" href={href(page - 1)}>
            {pick(locale, 'السابق', 'PREVIOUS')}
          </Link>
        )}
        <span>
          {pick(locale, 'صفحة', 'Page')} {page}
        </span>
        {customers.length === 50 && (
          <Link className="button button-ghost" href={href(page + 1)}>
            {pick(locale, 'التالي', 'NEXT')}
          </Link>
        )}
      </div>
    </div>
  );
}

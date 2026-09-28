export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];
export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
export function pick(locale: Locale, ar: string, en: string) {
  return locale === 'ar' ? ar : en;
}
export const copy = {
  ar: {
    home: 'الرئيسية',
    motorcycles: 'الدراجات',
    shop: 'المتجر',
    garage: 'مرآبي',
    account: 'حسابي',
    cart: 'السلة',
    search: 'بحث',
    reserve: 'احجز الدراجة',
    explore: 'اكتشف المجموعة',
    new: 'جديد',
    used: 'مستعمل',
    featured: 'مختارات REVORA',
    parts: 'المعدات والقطع',
    view: 'عرض التفاصيل',
    from: 'يبدأ من',
    currency: 'ج.م',
    noResults: 'لا توجد نتائج حالياً',
    all: 'الكل',
    filter: 'تصفية',
    contact: 'تواصل معنا',
    signIn: 'تسجيل الدخول',
    addCart: 'أضف للسلة',
    compare: 'قارن',
  },
  en: {
    home: 'Home',
    motorcycles: 'Motorcycles',
    shop: 'Shop',
    garage: 'My Garage',
    account: 'Account',
    cart: 'Cart',
    search: 'Search',
    reserve: 'Reserve motorcycle',
    explore: 'Explore collection',
    new: 'New',
    used: 'Used',
    featured: 'REVORA selection',
    parts: 'Gear & parts',
    view: 'View details',
    from: 'From',
    currency: 'EGP',
    noResults: 'No results yet',
    all: 'All',
    filter: 'Filter',
    contact: 'Contact us',
    signIn: 'Sign in',
    addCart: 'Add to cart',
    compare: 'Compare',
  },
};
export function formatCurrency(
  egp: number,
  locale: Locale,
  currency: 'EGP' | 'USD' = 'EGP',
) {
  const rate = Number(process.env.USD_EGP_RATE);
  const displayCurrency = currency === 'USD' && rate > 0 ? 'USD' : 'EGP';
  const value = displayCurrency === 'USD' ? egp / rate : egp;
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: displayCurrency,
    maximumFractionDigits: 2,
  }).format(value);
}

export const money = formatCurrency;

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, pick } from '@/lib/i18n';
import { supabase } from '@/lib/supabase/server';
const pages: Record<
  string,
  { ar: string; en: string; bodyAr: string[]; bodyEn: string[] }
> = {
  about: {
    ar: 'من نحن',
    en: 'ABOUT REVORA',
    bodyAr: [
      'REVORA MOTO مساحة لعشاق الدراجات في مصر. نجمع دراجات مختارة ومعدات قيادة وقطع غيار في تجربة واحدة.',
      'نؤمن بالمعلومات الواضحة والتوافق الصحيح قبل أي طلب أو حجز.',
    ],
    bodyEn: [
      'REVORA MOTO is a destination for motorcycle riders in Egypt, bringing selected motorcycles, riding gear and parts together.',
      'We believe in clear information and precise fitment before every order or reservation.',
    ],
  },
  contact: {
    ar: 'تواصل معنا',
    en: 'CONTACT US',
    bodyAr: [
      'للاستفسار عن الدراجات والطلبات، تواصل مع فريق المبيعات عبر بيانات الاتصال المعتمدة بعد إعداد المتجر.',
    ],
    bodyEn: [
      'For motorcycle and order enquiries, contact the sales team using the verified contact details configured for the store.',
    ],
  },
  faq: {
    ar: 'الأسئلة الشائعة',
    en: 'FREQUENTLY ASKED QUESTIONS',
    bodyAr: [
      'كيف أحجز دراجة؟ افتح صفحة الدراجة واختر حجز الدراجة، ثم الفرع المناسب. يسجل النظام الحجز بحالة انتظار الدفع.',
      'كيف أتأكد من توافق قطعة؟ استخدم صفحة البحث عن التوافق وحدد الماركة والموديل والسنة والنسخة.',
    ],
    bodyEn: [
      'How do I reserve a motorcycle? Open its detail page, select Reserve, then choose a branch. The request is recorded awaiting payment.',
      'How do I check part fitment? Use Fitment Search and select your brand, model, year and variant.',
    ],
  },
  warranty: {
    ar: 'معلومات الضمان',
    en: 'WARRANTY',
    bodyAr: [
      'تختلف شروط الضمان حسب المنتج أو الدراجة. راجع مستند الضمان المرفق بعملية الشراء وتواصل معنا قبل طلب خدمة الضمان.',
    ],
    bodyEn: [
      'Warranty terms vary by product and motorcycle. Review the warranty document supplied with your purchase and contact us before requesting service.',
    ],
  },
  returns: {
    ar: 'سياسة الاسترجاع',
    en: 'RETURNS',
    bodyAr: [
      'تُراجع طلبات الاسترجاع بحسب نوع المنتج وحالته وشروط البيع المطبقة عند الشراء. تواصل معنا برقم الطلب لبدء الطلب.',
    ],
    bodyEn: [
      'Return requests are reviewed according to product type, condition and the terms applicable at purchase. Contact us with your order number to begin.',
    ],
  },
  privacy: {
    ar: 'الخصوصية',
    en: 'PRIVACY',
    bodyAr: [
      'نستخدم بيانات الحساب والطلبات والحجوزات لخدمة العملاء وتشغيل المتجر. لا ننشر بيانات الحسابات أو المدفوعات للعامة.',
      'قبل الإطلاق العام، يجب استكمال نص سياسة الخصوصية القانونية وبيانات الجهة المسؤولة عن المعالجة.',
    ],
    bodyEn: [
      'We use account, order and reservation data to serve customers and operate the store. Account and payment data are not public.',
      'The legal privacy notice and controller details must be finalized before public launch.',
    ],
  },
  terms: {
    ar: 'الشروط والأحكام',
    en: 'TERMS',
    bodyAr: [
      'الدراجات تُحجز بعربون، ويُستكمل البيع مع فريق المبيعات. المنتجات العادية تُطلب عبر سلة التسوق.',
      'هذه الصفحة تحتاج إلى مراجعة قانونية وشروط بيع نهائية قبل الإطلاق.',
    ],
    bodyEn: [
      'Motorcycles are reserved with a deposit and completed with our sales team. Regular products are ordered through checkout.',
      'This page requires legal review and final sales terms before launch.',
    ],
  },
  branches: {
    ar: 'فروعنا',
    en: 'OUR BRANCHES',
    bodyAr: [
      'اختر الفرع المناسب لك عند حجز دراجتك. تظهر الفروع النشطة في نموذج الحجز.',
    ],
    bodyEn: [
      'Choose your preferred branch when reserving a motorcycle. Active branches are shown in the reservation form.',
    ],
  },
  promotions: {
    ar: 'العروض',
    en: 'PROMOTIONS',
    bodyAr: ['تظهر العروض المعتمدة ضمن أسعار المنتجات في المتجر.'],
    bodyEn: ['Active promotional prices appear on products in the shop.'],
  },
};
export default async function Info({
  params,
}: {
  params: Promise<{ locale: string; info: string }>;
}) {
  const { locale, info } = await params;
  if (!isLocale(locale)) notFound();
  if (info === 'brands') {
    const db = await supabase();
    const { data } = db
      ? await db.from('brands').select('id,name,slug').eq('active', true)
      : { data: [] };
    return (
      <div className="shell section-small">
        <span className="section-index">REVORA / BRANDS</span>
        <h1 className="page-title">
          {pick(locale, 'العلامات التجارية', 'BRANDS')}
        </h1>
        <div className="card-grid">
          {data?.map((b) => (
            <Link
              className="panel"
              href={`/${locale}/shop?brand=${b.slug}`}
              key={b.id}
            >
              <h2>{b.name} ↗</h2>
            </Link>
          ))}
        </div>
      </div>
    );
  }
  const page = pages[info];
  if (!page) notFound();
  return (
    <>
      <section className="page-hero">
        <div className="shell">
          <div className="breadcrumbs">
            <Link href={`/${locale}`}>REVORA</Link> / {info.toUpperCase()}
          </div>
          <span className="section-index">REVORA MOTO / INFORMATION</span>
          <h1 className="page-title">{pick(locale, page.ar, page.en)}</h1>
        </div>
      </section>
      <div className="shell section-small" style={{ maxWidth: 850 }}>
        {(locale === 'ar' ? page.bodyAr : page.bodyEn).map((p, i) => (
          <p key={i} style={{ lineHeight: 1.9, color: 'var(--muted)' }}>
            {p}
          </p>
        ))}
      </div>
    </>
  );
}

import type { Locale } from '@/lib/i18n';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
type StatusCopy = { ar: string; en: string; tone: Tone };

const statusCopy: Record<string, StatusCopy> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending', tone: 'warning' },
  pending_payment: {
    ar: 'في انتظار الدفع',
    en: 'Awaiting payment',
    tone: 'warning',
  },
  awaiting_payment: {
    ar: 'في انتظار الدفع',
    en: 'Awaiting payment',
    tone: 'warning',
  },
  paid: { ar: 'تم الدفع', en: 'Paid', tone: 'success' },
  authorized: { ar: 'تم التفويض', en: 'Authorized', tone: 'info' },
  captured: { ar: 'تم التحصيل', en: 'Captured', tone: 'success' },
  deposit_paid: { ar: 'تم دفع العربون', en: 'Deposit paid', tone: 'success' },
  processing: { ar: 'قيد التجهيز', en: 'Processing', tone: 'info' },
  shipped: { ar: 'تم الشحن', en: 'Shipped', tone: 'info' },
  delivered: { ar: 'تم التسليم', en: 'Delivered', tone: 'success' },
  completed: { ar: 'مكتمل', en: 'Completed', tone: 'success' },
  contacted: { ar: 'تم التواصل', en: 'Contacted', tone: 'info' },
  appointment_scheduled: {
    ar: 'تم تحديد الموعد',
    en: 'Appointment scheduled',
    tone: 'info',
  },
  requested: { ar: 'تم الطلب', en: 'Requested', tone: 'warning' },
  under_review: { ar: 'قيد المراجعة', en: 'Under review', tone: 'warning' },
  reviewing: { ar: 'قيد المراجعة', en: 'Under review', tone: 'warning' },
  approved: { ar: 'تمت الموافقة', en: 'Approved', tone: 'success' },
  rejected: { ar: 'مرفوض', en: 'Rejected', tone: 'danger' },
  received: { ar: 'تم الاستلام', en: 'Received', tone: 'info' },
  placed: { ar: 'تم الإرسال للمورد', en: 'Placed', tone: 'info' },
  partially_received: {
    ar: 'تم استلام جزء من الكمية',
    en: 'Partially received',
    tone: 'warning',
  },
  receiving: { ar: 'جارٍ الاستلام', en: 'Receiving', tone: 'info' },
  inspected: { ar: 'تم الفحص', en: 'Inspected', tone: 'info' },
  refund_pending: {
    ar: 'بانتظار الاسترداد',
    en: 'Refund pending',
    tone: 'warning',
  },
  refunded: { ar: 'تم الاسترداد', en: 'Refunded', tone: 'neutral' },
  partially_refunded: {
    ar: 'تم استرداد جزء',
    en: 'Partially refunded',
    tone: 'warning',
  },
  cancelled: { ar: 'ملغي', en: 'Cancelled', tone: 'danger' },
  expired: { ar: 'منتهي', en: 'Expired', tone: 'neutral' },
  failed: { ar: 'فشل', en: 'Failed', tone: 'danger' },
  reserved: { ar: 'محجوز', en: 'Reserved', tone: 'warning' },
  provider_required: {
    ar: 'بانتظار إعداد مزود الدفع',
    en: 'Payment provider setup required',
    tone: 'warning',
  },
  active: { ar: 'نشط', en: 'Active', tone: 'success' },
  inactive: { ar: 'غير نشط', en: 'Inactive', tone: 'neutral' },
  published: { ar: 'منشور', en: 'Published', tone: 'success' },
  draft: { ar: 'مسودة', en: 'Draft', tone: 'neutral' },
};

export function localizedStatus(status: string, locale: Locale) {
  const copy = statusCopy[status];
  return copy
    ? locale === 'ar'
      ? copy.ar
      : copy.en
    : locale === 'ar'
      ? 'حالة أخرى'
      : 'Other status';
}

export function StatusBadge({
  status,
  locale,
}: {
  status: string;
  locale: Locale;
}) {
  const mapped = statusCopy[status];
  const tone = mapped?.tone || 'neutral';
  return (
    <span
      className="status status-chip status-badge-label"
      data-tone={tone}
      data-status={status}
    >
      {localizedStatus(status, locale)}
    </span>
  );
}

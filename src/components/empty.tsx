import type { Locale } from '@/lib/i18n';
import { pick } from '@/lib/i18n';

export function Empty({ locale }: { locale: Locale }) {
  return (
    <div className="empty-state">
      <span>R/</span>
      <p>
        {pick(
          locale,
          'المجموعة قيد التجهيز. تواصل معنا للمزيد من المعلومات.',
          'Our collection is being prepared. Contact us for details.',
        )}
      </p>
    </div>
  );
}

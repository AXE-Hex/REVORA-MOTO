'use client';

import { RouteError } from '@/components/ui/route-feedback';

export default function LocaleError({ reset }: { reset: () => void }) {
  return <RouteError reset={reset} />;
}

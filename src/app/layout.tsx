import './globals.css';
import type { Metadata } from 'next';
import { arabicUi, bodyEnglish, displayEnglish } from './fonts';
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  ),
  title: 'REVORA MOTO',
  description: 'Motorcycles, riding gear and precision parts in Egypt.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body
        className={`${displayEnglish.variable} ${bodyEnglish.variable} ${arabicUi.variable}`}
      >
        {children}
      </body>
    </html>
  );
}

import localFont from 'next/font/local';

export const displayEnglish = localFont({
  src: [
    {
      path: '../../public/fonts/revora/redhat-display-regular.otf',
      weight: '400',
    },
    {
      path: '../../public/fonts/revora/redhat-display-medium.otf',
      weight: '500',
    },
    {
      path: '../../public/fonts/revora/redhat-display-bold.otf',
      weight: '700',
    },
    {
      path: '../../public/fonts/revora/redhat-display-black.otf',
      weight: '900',
    },
  ],
  variable: '--font-display-en',
  display: 'swap',
});

export const bodyEnglish = localFont({
  src: [
    {
      path: '../../public/fonts/revora/redhat-text-regular.otf',
      weight: '400',
    },
    { path: '../../public/fonts/revora/redhat-text-medium.otf', weight: '500' },
    {
      path: '../../public/fonts/revora/redhat-text-semibold.otf',
      weight: '600',
    },
    { path: '../../public/fonts/revora/redhat-text-bold.otf', weight: '700' },
  ],
  variable: '--font-body-en',
  display: 'swap',
});

export const arabicUi = localFont({
  src: '../../public/fonts/revora/noto-sans-arabic-variable.ttf',
  variable: '--font-arabic',
  weight: '100 900',
  display: 'swap',
});

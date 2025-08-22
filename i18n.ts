import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
const locales = ['tr', 'en', 'de'];
const timeZone = 'Europe/Istanbul';

export default getRequestConfig(async () => {
  // Server-side'da default locale kullan, client-side'da localStorage'den okuyacağız
  const locale = 'tr';

  return {
    locale,
    timeZone: timeZone,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});

export { locales, timeZone };
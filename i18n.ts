import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
const locales = ['tr', 'en', 'de'];

export default getRequestConfig(async () => {
  // Server-side'da default locale kullan, client-side'da localStorage'den okuyacağız
  const locale = 'tr';

  return {
    locale,
    timeZone: 'Europe/Istanbul',
    messages: (await import(`./messages/${locale}.json`)).default
  };
});

export { locales };
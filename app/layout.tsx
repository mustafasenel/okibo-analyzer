import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { getMessages } from 'next-intl/server';
import BottomNavBar from '@/components/layout/BottomNavBar';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { timeZone } from '@/i18n';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Invoice Analyzer',
  description: 'Scan and analyze your invoices with AI.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Okibo Invoice Analyzer',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Okibo Invoice Analyzer',
    title: 'Invoice Analyzer',
    description: 'AI-powered invoice analysis application',
  },
  icons: {
    shortcut: '/favicon.ico',
    apple: [
      { url: '/icons/icon-152x152.png' },
      { url: '/icons/icon-192x192.png' },
    ],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let messages;
  try {
    messages = await getMessages();
  } catch (error) {
    console.error('Error loading messages:', error);
    messages = {};
  }

  return (
    <html suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Okibo" />
        <link rel="apple-touch-icon" href="/next.svg" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} bg-gray-100`}>
        <LanguageProvider initialMessages={messages} timeZone={timeZone}>
          <main className="pb-20">
            {children}
          </main>
          <BottomNavBar />
        </LanguageProvider>
      </body>
    </html>
  );
}
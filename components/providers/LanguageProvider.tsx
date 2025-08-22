'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';

const locales = ['tr', 'en', 'de'];

interface LanguageContextType {
  locale: string;
  setLocale: (locale: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

interface LanguageProviderProps {
  children: ReactNode;
  initialMessages: any;
  timeZone: string;
}

export function LanguageProvider({ children, initialMessages, timeZone }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState('tr');
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Client-side'da localStorage'den dil bilgisini oku
    const savedLocale = localStorage.getItem('language') || 'tr';
    if (savedLocale !== locale && locales.includes(savedLocale)) {
      setLocaleState(savedLocale);
      loadMessages(savedLocale);
    }
  }, []);

  const loadMessages = async (newLocale: string) => {
    if (!locales.includes(newLocale)) return;
    
    setIsLoading(true);
    try {
      const newMessages = await import(`@/messages/${newLocale}.json`);
      setMessages(newMessages.default);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setLocale = async (newLocale: string) => {
    if (!locales.includes(newLocale) || newLocale === locale) return;
    
    localStorage.setItem('language', newLocale);
    setLocaleState(newLocale);
    await loadMessages(newLocale);
  };

  const contextValue = {
    locale,
    setLocale,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <LanguageContext.Provider value={contextValue}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  );
}

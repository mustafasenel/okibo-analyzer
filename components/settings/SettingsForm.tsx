'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLanguage } from '@/components/providers/LanguageProvider';

const locales = ['tr', 'en', 'de'];

export default function SettingsForm() {
    const t = useTranslations('SettingsPage');
    const { locale, setLocale } = useLanguage();
    const [selectedLanguage, setSelectedLanguage] = useState(locale);
    const [companyCode, setCompanyCode] = useState('');
    const [message, setMessage] = useState('');

    const languageNames = {
        tr: 'Türkçe',
        en: 'English',
        de: 'Deutsch'
    };

    useEffect(() => {
        // Dil ayarını context'ten senkronize et
        setSelectedLanguage(locale);

        // Firma kodunu yükle
        const savedCode = localStorage.getItem('companyCode');
        if (savedCode) {
            setCompanyCode(savedCode);
        }
    }, [locale]);

    const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLanguage = e.target.value;
        setSelectedLanguage(newLanguage);
        setMessage(t('languageChanged'));
        await setLocale(newLanguage);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleSave = () => {
        localStorage.setItem('companyCode', companyCode);
        setMessage(t('settingsSaved'));
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className="space-y-8">
            {/* Dil Seçici */}
            <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('language')}
                </label>
                <select
                    id="language"
                    value={selectedLanguage}
                    onChange={handleLanguageChange}
                    className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                    {locales.map((locale) => (
                        <option key={locale} value={locale}>
                            {languageNames[locale as keyof typeof languageNames]}
                        </option>
                    ))}
                </select>
            </div>

            {/* Uygulama Ayarları */}
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('appSettings')}</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="companyCode" className="block text-sm font-medium text-gray-700 mb-2">
                            {t('companyCode')}
                        </label>
                        <input
                            type="text"
                            id="companyCode"
                            name="companyCode"
                            value={companyCode}
                            onChange={(e) => setCompanyCode(e.target.value)}
                            className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="ÖR: OKIBO01"
                        />
                    </div>
                </div>
            </div>

            <button 
                onClick={handleSave} 
                className="w-full bg-violet-600 text-white font-bold py-3 rounded-lg hover:bg-violet-700 transition-colors"
            >
                {t('saveSettings')}
            </button>
            
            {message && (
                <p className="text-green-600 mt-4 text-center font-medium bg-green-50 p-3 rounded-lg">
                    {message}
                </p>
            )}
        </div>
    );
}
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLanguage } from '@/components/providers/LanguageProvider';

const locales = ['tr', 'en', 'de'];

export default function SettingsForm() {
    const t = useTranslations('SettingsPage');
    const { locale, setLocale } = useLanguage();
    const [selectedLanguage, setSelectedLanguage] = useState(locale);
    const [dbConfig, setDbConfig] = useState({
        host: '',
        user: '',
        password: '',
        database: ''
    });
    const [message, setMessage] = useState('');

    const languageNames = {
        tr: 'Türkçe',
        en: 'English',
        de: 'Deutsch'
    };

    useEffect(() => {
        // Dil ayarını context'ten senkronize et
        setSelectedLanguage(locale);

        // DB ayarlarını yükle
        const savedConfig = localStorage.getItem('dbConfig');
        if (savedConfig) {
            setDbConfig(JSON.parse(savedConfig));
        }
    }, [locale]);

    const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLanguage = e.target.value;
        setSelectedLanguage(newLanguage);
        setMessage(t('languageChanged'));
        await setLocale(newLanguage);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleDbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDbConfig({ ...dbConfig, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        localStorage.setItem('dbConfig', JSON.stringify(dbConfig));
        setMessage(t('settingsSaved'));
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className="space-y-6">
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

            {/* Veritabanı Ayarları */}
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('databaseSettings')}</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-2">
                            {t('host')}
                        </label>
                        <input
                            type="text"
                            id="host"
                            name="host"
                            value={dbConfig.host}
                            onChange={handleDbChange}
                            className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="localhost"
                        />
                    </div>
                    <div>
                        <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-2">
                            {t('username')}
                        </label>
                        <input
                            type="text"
                            id="user"
                            name="user"
                            value={dbConfig.user}
                            onChange={handleDbChange}
                            className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="root"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            {t('password')}
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={dbConfig.password}
                            onChange={handleDbChange}
                            className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label htmlFor="database" className="block text-sm font-medium text-gray-700 mb-2">
                            {t('database')}
                        </label>
                        <input
                            type="text"
                            id="database"
                            name="database"
                            value={dbConfig.database}
                            onChange={handleDbChange}
                            className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="invoices"
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
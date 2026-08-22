'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLanguage } from '@/components/providers/LanguageProvider';
import Link from 'next/link';
import { LogIn, Building2, TrendingUp, Calendar, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveCompanyCode, verifyCompanyCode } from '@/hooks/use-company-code';

const locales = ['tr', 'en', 'de'];

export default function SettingsForm() {
    const t = useTranslations('SettingsPage');
    const tGuard = useTranslations('CompanyGuard');
    const { locale, setLocale } = useLanguage();
    const [selectedLanguage, setSelectedLanguage] = useState(locale);
    const [companyCode, setCompanyCode] = useState('');
    const [message, setMessage] = useState('');
    const [saveError, setSaveError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [companyStats, setCompanyStats] = useState<any>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);

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
            fetchCompanyStats(savedCode);
        }
    }, [locale]);

    const fetchCompanyStats = async (code: string) => {
        if (!code) {
            setCompanyStats(null);
            return;
        }
        
        setIsLoadingStats(true);
        try {
            const response = await fetch(`/api/company/stats?code=${code}`);
            const data = await response.json();
            
            if (data.success) {
                setCompanyStats(data.company);
            } else {
                setCompanyStats(null);
            }
        } catch (error) {
            console.error('Error fetching company stats:', error);
            setCompanyStats(null);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const handleLanguageChange = async (newLanguage: string) => {
        setSelectedLanguage(newLanguage);
        setMessage(t('languageChanged'));
        await setLocale(newLanguage);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleSave = async () => {
        const code = companyCode.trim();
        setMessage('');
        setSaveError('');

        if (!code) {
            setSaveError(tGuard('emptyCode'));
            return;
        }

        // Kodu kaydetmeden önce sunucuda doğrula — geçersiz kod kaydedilmesin.
        setIsSaving(true);
        const result = await verifyCompanyCode(code);
        setIsSaving(false);

        if (!result.ok) {
            if (result.reason === 'invalid') setSaveError(tGuard('invalidDescription'));
            else if (result.reason === 'inactive') setSaveError(tGuard('inactiveDescription'));
            else setSaveError(tGuard('offlineError'));
            setCompanyStats(null);
            return;
        }

        saveCompanyCode(code);       // localStorage + global bildirim
        setCompanyCode(code);
        setCompanyStats(result.company);
        setMessage(t('settingsSaved'));
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className="space-y-8 relative">
            {/* Dil Seçici */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('language')}
                </label>
                <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Dil seçin" />
                    </SelectTrigger>
                    <SelectContent>
                        {locales.map((locale) => (
                            <SelectItem key={locale} value={locale}>
                                {languageNames[locale as keyof typeof languageNames]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
                            onChange={(e) => { setCompanyCode(e.target.value); setSaveError(''); }}
                            className={`w-full p-3 bg-white text-gray-900 border rounded-lg focus:ring-2 focus:border-transparent ${
                                saveError
                                    ? 'border-red-300 focus:ring-red-500'
                                    : 'border-gray-300 focus:ring-violet-500'
                            }`}
                            placeholder="ÖR: OKIBO01"
                        />
                        {saveError ? (
                            <p className="mt-2 flex items-start gap-1.5 text-sm text-red-600">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{saveError}</span>
                            </p>
                        ) : companyStats ? (
                            <p className="mt-2 flex items-center gap-1.5 text-sm text-green-600">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>{tGuard('verified', { name: companyStats.name })}</span>
                            </p>
                        ) : (
                            <p className="mt-2 text-xs text-gray-500">{tGuard('codeHint')}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Firma İstatistikleri */}
            {companyStats && (
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-6 rounded-xl border border-violet-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Building2 className="h-5 w-5 text-violet-600" />
                        <h3 className="text-lg font-semibold text-gray-900">{companyStats.name}</h3>
                    </div>
                    
                    <div className="space-y-4">
                        {/* Kullanım İstatistiği */}
                        <div className="bg-white p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-violet-600" />
                                    <span className="text-sm font-medium text-gray-700">Aylık Kullanım</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900">
                                    {companyStats.currentMonthUsage} / {companyStats.monthlyLimit}
                                </span>
                            </div>
                            
                            {/* İlerleme Çubuğu */}
                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                <div 
                                    className={`h-2.5 rounded-full transition-all duration-500 ${
                                        companyStats.usagePercentage >= 90 
                                            ? 'bg-red-600' 
                                            : companyStats.usagePercentage >= 70 
                                            ? 'bg-yellow-500' 
                                            : 'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(companyStats.usagePercentage, 100)}%` }}
                                />
                            </div>
                            
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-500">
                                    Kalan: {companyStats.remainingScans} tarama
                                </span>
                                <span className={`text-xs font-semibold ${
                                    companyStats.usagePercentage >= 90 
                                        ? 'text-red-600' 
                                        : companyStats.usagePercentage >= 70 
                                        ? 'text-yellow-600' 
                                        : 'text-green-600'
                                }`}>
                                    %{companyStats.usagePercentage}
                                </span>
                            </div>
                        </div>
                        
                        {/* Son Sıfırlama Tarihi */}
                        {companyStats.lastResetDate && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                                    Son sıfırlama: {new Date(companyStats.lastResetDate).toLocaleDateString('tr-TR')}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isLoadingStats && (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded"></div>
                </div>
            )}

            <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 font-bold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving ? tGuard('verifying') : t('saveSettings')}
            </button>
            {message && (
                <p className="text-green-600 mt-4 text-center font-medium bg-green-50 p-3 rounded-lg">
                    {message}
                </p>
            )}
            <div className="absolute bottom-0 right-0">
                <Link
                    href="/admin/login"
                    className="inline-flex items-center p-2 text-xs text-gray-500 hover:text-gray-800">
                    <LogIn className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}
'use client';

import SettingsForm from '@/components/settings/SettingsForm';
import { useTranslations } from 'next-intl';

export default function SettingsPage() {
  const t = useTranslations('SettingsPage');
  
  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('title')}</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <SettingsForm />
      </div>
    </div>
  );
}
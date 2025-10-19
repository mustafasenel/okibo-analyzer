'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ScanLine, History, Settings, FileSearch } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function BottomNavBar() {
  const t = useTranslations('BottomNavBar');
  const pathname = usePathname();

  // Dil segmentini (`/tr`, `/en`) URL'den kaldırmak için bir regex
  const cleanPathname = pathname.replace(/^\/(tr|en|de)/, '') || '/';

  const navItems = [
    { href: '/', label: t('scan'), icon: ScanLine },
    { href: '/review', label: t('review'), icon: FileSearch },
    { href: '/history', label: t('history'), icon: History },
    { href: '/settings', label: t('settings'), icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-around items-center h-full max-w-lg mx-auto">
        {navItems.map((item) => {
          // Aktif link kontrolünü dilden bağımsız yap
          const isActive = cleanPathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center w-full h-full text-sm"
            >
              <item.icon className={`h-6 w-6 mb-1 transition-colors ${isActive ? 'text-violet-600' : 'text-gray-500'}`} />
              <span className={`transition-colors ${isActive ? 'font-bold text-violet-600' : 'text-gray-600'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
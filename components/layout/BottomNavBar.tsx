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
    <nav 
      className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[var(--ok-line)] z-50" 
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        marginBottom: '0px',
        boxSizing: 'content-box',
        width: '100%',
        minHeight: '64px'
      }}
    >
      <div className="flex justify-around items-center h-full max-w-lg mx-auto">
        {navItems.map((item) => {
          // Aktif link kontrolünü dilden bağımsız yap
          const isActive = cleanPathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex h-full w-full flex-col items-center justify-center gap-1 text-[12px]"
            >
              <item.icon
                className={`h-[21px] w-[21px] transition-colors ${isActive ? 'text-[var(--ok-purple)]' : 'text-[var(--ok-muted-2)]'}`}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span className={`transition-colors ${isActive ? 'font-bold text-[var(--ok-purple)]' : 'text-[var(--ok-muted)]'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1.5 h-[2px] w-5 rounded-full bg-[var(--ok-purple)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
'use client';

import { usePathname } from 'next/navigation';
import BottomNavBar from '@/components/layout/BottomNavBar';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <>
      <main className={!isAdminRoute ? 'pb-20' : ''}>
        {children}
      </main>
      {!isAdminRoute && <BottomNavBar />}
    </>
  );
}

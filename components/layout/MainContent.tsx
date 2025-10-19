'use client';

import { usePathname } from 'next/navigation';
import BottomNavBar from '@/components/layout/BottomNavBar';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col">
      <main className={`flex-1 ${!isAdminRoute ? 'pb-20' : ''}`}>
        {children}
      </main>
      {!isAdminRoute && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <BottomNavBar />
        </div>
      )}
    </div>
  );
}

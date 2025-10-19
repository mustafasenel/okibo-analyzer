'use client';

import { usePathname } from 'next/navigation';
import BottomNavBar from '@/components/layout/BottomNavBar';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <div className="h-screen flex flex-col" style={{ height: '100dvh' }}>
      <main className={`flex-1 overflow-y-auto ${!isAdminRoute ? 'pb-16' : ''}`} style={{ 
        paddingBottom: !isAdminRoute ? '64px' : '0px',
        marginBottom: '0px'
      }}>
        {children}
      </main>
      {!isAdminRoute && (
        <div className="fixed bottom-0 left-0 right-0 z-50" style={{ 
          bottom: '0px',
          marginBottom: '0px'
        }}>
          <BottomNavBar />
        </div>
      )}
    </div>
  );
}

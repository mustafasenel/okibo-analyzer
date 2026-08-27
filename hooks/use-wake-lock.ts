'use client';

import { useEffect } from 'react';

/**
 * Analiz sürerken ekranın uykuya geçmesini engeller.
 * İstek arka planda sürmediği için ekranın açık kalması kritik.
 * Desteklenmeyen tarayıcılarda sessizce devre dışı kalır.
 */
export function useWakeLock(active: boolean) {
    useEffect(() => {
        if (!active) return;
        let sentinel: any = null;
        let released = false;

        const request = async () => {
            try {
                const wl = (navigator as any).wakeLock;
                if (!wl?.request) return;
                sentinel = await wl.request('screen');
            } catch {
                /* izin yok / desteklenmiyor */
            }
        };

        // Sekmeye geri dönülünce kilidi tazele
        const onVisibility = () => {
            if (document.visibilityState === 'visible' && !released) void request();
        };

        void request();
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            released = true;
            document.removeEventListener('visibilitychange', onVisibility);
            try { sentinel?.release?.(); } catch { /* yoksay */ }
        };
    }, [active]);
}

'use client';

import { useCallback, useEffect, useState } from 'react';

export const COMPANY_CODE_KEY = 'companyCode';
export const COMPANY_CODE_EVENT = 'companyCodeChanged';

// Firma kodunun durumu:
//  loading  → henüz kontrol ediliyor
//  missing  → hiç girilmemiş
//  invalid  → girilmiş ama sistemde böyle bir firma yok
//  inactive → firma var ama pasif durumda
//  valid    → her şey yolunda
//  offline  → doğrulanamadı (ağ hatası). Kullanıcıyı bloklamayız.
export type CompanyStatus = 'loading' | 'missing' | 'invalid' | 'inactive' | 'valid' | 'offline';

export interface CompanyInfo {
    name: string;
    code: string;
    isActive: boolean;
    monthlyCredits: number;
    usedCredits: number;
    remainingCredits: number;
    modelName: string | null;
    creditMultiplier: number;
    usagePercentage: number;
    remainingScans: number;
    lastResetDate: string;
}

/** Firma kodunu kaydeder ve tüm dinleyicileri haberdar eder. */
export function saveCompanyCode(code: string) {
    localStorage.setItem(COMPANY_CODE_KEY, code);
    window.dispatchEvent(new Event(COMPANY_CODE_EVENT));
}

/** Firma kodunu siler ve dinleyicileri haberdar eder. */
export function clearCompanyCode() {
    localStorage.removeItem(COMPANY_CODE_KEY);
    window.dispatchEvent(new Event(COMPANY_CODE_EVENT));
}

/** Bir firma kodunu sunucuya doğrulatır. */
export async function verifyCompanyCode(code: string): Promise<
    { ok: true; company: CompanyInfo } | { ok: false; reason: 'invalid' | 'inactive' | 'offline' }
> {
    try {
        const res = await fetch(`/api/company/stats?code=${encodeURIComponent(code)}`);
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success || !data.company) {
            return { ok: false, reason: 'invalid' };
        }
        if (data.company.isActive === false) {
            return { ok: false, reason: 'inactive' };
        }
        return { ok: true, company: data.company as CompanyInfo };
    } catch {
        return { ok: false, reason: 'offline' };
    }
}

/**
 * Kayıtlı firma kodunu okur ve sunucuda doğrular.
 * Kod değiştiğinde (ayarlar sayfası, başka sekme) otomatik güncellenir.
 */
export function useCompanyCode() {
    const [companyCode, setCompanyCode] = useState<string | null>(null);
    const [status, setStatus] = useState<CompanyStatus>('loading');
    const [company, setCompany] = useState<CompanyInfo | null>(null);

    const check = useCallback(async () => {
        const saved = localStorage.getItem(COMPANY_CODE_KEY);
        setCompanyCode(saved);

        if (!saved) {
            setCompany(null);
            setStatus('missing');
            return;
        }

        const result = await verifyCompanyCode(saved);
        if (result.ok) {
            setCompany(result.company);
            setStatus('valid');
        } else {
            setCompany(null);
            // Ağ hatasında kullanıcıyı kilitlemeyiz (offline kullanım).
            setStatus(result.reason);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        const run = () => { if (!cancelled) void check(); };

        run();
        window.addEventListener(COMPANY_CODE_EVENT, run);
        window.addEventListener('storage', run);
        return () => {
            cancelled = true;
            window.removeEventListener(COMPANY_CODE_EVENT, run);
            window.removeEventListener('storage', run);
        };
    }, [check]);

    // Taramaya izin verilen durumlar: doğrulanmış ya da doğrulanamamış (offline) ama kod var.
    const canScan = status === 'valid' || status === 'offline';
    // Kullanıcının müdahalesi gereken durumlar
    const needsAttention = status === 'missing' || status === 'invalid' || status === 'inactive';

    return { companyCode, status, company, canScan, needsAttention, recheck: check };
}

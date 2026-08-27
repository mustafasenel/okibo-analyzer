'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, Loader2, Share2 } from 'lucide-react';

interface UsageData {
    monthlyCredits: number;
    usedCredits: number;
    remainingCredits: number;
    resetAt: string;
    days: { date: string; credits: number }[];
    recent: { id: string; name: string; createdAt: string; pages: number; credits: number }[];
}

/** Kullanım detayı — kalan kota, son 7 gün ve son hareketler. */
export default function UsageDetail({ code, onClose }: { code: string; onClose: () => void }) {
    const t = useTranslations('Usage');
    const [data, setData] = useState<UsageData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/company/usage?code=${encodeURIComponent(code)}`)
            .then(r => r.json())
            .then(d => { if (!cancelled && d.success) setData(d.usage); })
            .catch(() => { /* sessiz */ })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [code]);

    const share = async () => {
        if (!data) return;
        const text = t('shareText', {
            used: data.usedCredits,
            total: data.monthlyCredits,
            remaining: data.remainingCredits,
        });
        try {
            if (navigator.share) await navigator.share({ text });
            else await navigator.clipboard.writeText(text);
        } catch { /* kullanıcı iptal etti */ }
    };

    const maxCredits = Math.max(1, ...(data?.days.map(d => d.credits) ?? [1]));
    const dayLabels = t('dayLabels').split(',');

    const when = (iso: string) => {
        const d = new Date(iso);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const y = new Date(today); y.setDate(y.getDate() - 1);
        const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        if (d >= today) return t('today', { time });
        if (d >= y) return t('yesterday', { time });
        return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) + ' · ' + time;
    };

    return (
        <div className="fixed inset-0 z-[55] flex flex-col bg-[var(--ok-surface)]">
            <div className="mx-auto flex w-full max-w-lg items-center gap-1 border-b border-[var(--ok-line)] bg-white px-4 py-3.5">
                <button onClick={onClose} className="flex items-center gap-1 text-sm font-semibold text-[var(--ok-body)]">
                    <ChevronLeft className="h-4 w-4" />
                    {t('back')}
                </button>
            </div>

            <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 pb-8 pt-5">
                <h1 className="text-[22px] font-bold tracking-[-.02em] text-[var(--ok-ink)]">{t('title')}</h1>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-[var(--ok-purple)]" />
                    </div>
                ) : !data ? (
                    <p className="py-10 text-center text-[13px] text-[var(--ok-muted)]">{t('noData')}</p>
                ) : (
                    <>
                        {/* Kalan */}
                        <div className="mt-4 rounded-xl border border-[var(--ok-line)] bg-white p-5">
                            <div className="flex items-baseline gap-2">
                                <span className="text-[40px] font-bold leading-none tabular-nums text-[var(--ok-ink)]">
                                    {data.remainingCredits}
                                </span>
                                <span className="text-[13px] font-medium text-[var(--ok-muted)]">{t('remaining')}</span>
                            </div>
                            <p className="mt-2 text-[12.5px] text-[var(--ok-muted)]">
                                {t('usedOf', { used: data.usedCredits, total: data.monthlyCredits })}
                            </p>
                            <p className="mt-0.5 text-[12px] text-[var(--ok-muted-2)]">
                                {t('renews', { date: new Date(data.resetAt).toLocaleDateString('tr-TR') })}
                            </p>
                        </div>

                        {/* Son 7 gün */}
                        <h2 className="ok-mono mb-2 mt-6 px-0.5 text-[10px] text-[var(--ok-muted)]">{t('last7')}</h2>
                        <div className="rounded-xl border border-[var(--ok-line)] bg-white p-4">
                            <div className="flex h-[110px] items-end justify-between gap-2">
                                {data.days.map((d, i) => {
                                    const height = d.credits > 0 ? Math.max(6, (d.credits / maxCredits) * 90) : 3;
                                    const isToday = i === data.days.length - 1;
                                    return (
                                        <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                                            {d.credits > 0 && (
                                                <span className="text-[10px] font-bold tabular-nums text-[var(--ok-muted)]">{d.credits}</span>
                                            )}
                                            <div
                                                className={`w-full rounded-[4px] ${isToday ? 'bg-[var(--ok-purple)]' : d.credits > 0 ? 'bg-[var(--ok-purple-soft)]' : 'bg-[var(--ok-line)]'}`}
                                                style={{ height: `${height}px` }}
                                            />
                                            <span className="ok-mono text-[9px] text-[var(--ok-muted-2)]">
                                                {isToday ? t('todayShort') : dayLabels[new Date(d.date).getDay()]}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Son hareketler */}
                        <h2 className="ok-mono mb-2 mt-6 px-0.5 text-[10px] text-[var(--ok-muted)]">{t('recent')}</h2>
                        <div className="overflow-hidden rounded-xl border border-[var(--ok-line)] bg-white">
                            {data.recent.length === 0 ? (
                                <p className="px-3.5 py-6 text-center text-[12.5px] text-[var(--ok-muted)]">{t('noActivity')}</p>
                            ) : data.recent.map((r, i, arr) => (
                                <div key={r.id}
                                    className={`flex items-center gap-3 px-3.5 py-3 ${i < arr.length - 1 ? 'border-b border-[var(--ok-line)]' : ''}`}>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-semibold text-[var(--ok-ink)]">
                                            {r.name || t('unnamedInvoice')}
                                        </p>
                                        <p className="mt-px text-[11.5px] text-[var(--ok-muted)]">
                                            {when(r.createdAt)} · {t('pages', { count: r.pages })}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-[13px] font-bold tabular-nums text-[var(--ok-ink)]">
                                        −{r.credits}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <p className="mt-4 text-[11.5px] leading-relaxed text-[var(--ok-muted)]">{t('note')}</p>

                        <button onClick={share}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--ok-line)] bg-white py-3.5 text-[14px] font-semibold text-[var(--ok-body)]">
                            <Share2 className="h-4 w-4" />
                            {t('share')}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

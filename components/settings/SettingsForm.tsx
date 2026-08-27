'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
    Loader2, ShieldCheck, AlertCircle, ChevronRight, LogIn, LogOut,
    Languages, LifeBuoy, Pencil,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useCompanyCode, saveCompanyCode, clearCompanyCode, verifyCompanyCode } from '@/hooks/use-company-code';
import UsageDetail from '@/components/settings/UsageDetail';

const LOCALES = ['tr', 'en', 'de'] as const;
const LOCALE_NAMES: Record<string, string> = { tr: 'Türkçe', en: 'English', de: 'Deutsch' };
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

/** Ayarlar — form değil durum ekranı. Tek gerçek girdi firma kodu. */
export default function SettingsForm() {
    const t = useTranslations('Settings');
    const { locale, setLocale } = useLanguage();
    const { status, company, recheck } = useCompanyCode();

    const [draftCode, setDraftCode] = useState('');
    const [editing, setEditing] = useState(false);      // bağlıyken kodu değiştirme modu
    const [confirmChange, setConfirmChange] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState('');
    const [showUsage, setShowUsage] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const connected = status === 'valid' && !!company;

    useEffect(() => {
        if (company) setLastSync(new Date());
    }, [company]);

    const connect = async () => {
        const code = draftCode.trim();
        if (!code) { setError(t('emptyCode')); return; }
        setError('');
        setConnecting(true);
        const result = await verifyCompanyCode(code);
        setConnecting(false);
        if (!result.ok) {
            setError(result.reason === 'inactive' ? t('inactiveCode') : result.reason === 'offline' ? t('offlineError') : t('invalidCode'));
            return;
        }
        saveCompanyCode(code);   // satır bazlı otomatik kayıt — ayrı "kaydet" yok
        setEditing(false);
        setDraftCode('');
        void recheck();
    };

    const disconnect = () => {
        clearCompanyCode();
        setDraftCode('');
        setEditing(false);
    };

    // ── Bağlı değil / kod değiştiriliyor → kurulum ekranı ────────────────
    if (!connected || editing) {
        return (
            <div className="mx-auto w-full max-w-lg px-4 pb-28 pt-5">
                <h1 className="text-[22px] font-bold tracking-[-.02em] text-[var(--ok-ink)]">{t('connectTitle')}</h1>
                <p className="mt-1 text-[13px] text-[var(--ok-muted)]">{t('connectSubtitle')}</p>

                <label className="ok-mono mb-2 mt-6 block text-[10px] text-[var(--ok-muted)]">{t('companyCode')}</label>
                <input
                    value={draftCode}
                    onChange={(e) => { setDraftCode(e.target.value.toUpperCase()); setError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') void connect(); }}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="OKIBO01"
                    className={`w-full rounded-xl border-[1.5px] bg-white px-4 py-4 font-mono text-[22px] font-bold tracking-[.08em] text-[var(--ok-ink)] outline-none transition ${
                        error ? 'border-[var(--ok-danger)]' : 'border-[var(--ok-purple)] focus:ring-4 focus:ring-[var(--ok-purple)]/15'
                    }`}
                />
                <p className="mt-2 text-[12px] leading-relaxed text-[var(--ok-muted)]">{t('codeHint')}</p>

                {connecting && (
                    <p className="mt-3 flex items-center gap-2 text-[12.5px] font-medium text-[var(--ok-purple)]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {t('verifying')}
                    </p>
                )}
                {error && (
                    <p className="mt-3 flex items-start gap-1.5 text-[12.5px] font-medium text-[var(--ok-danger)]">
                        <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                        {error}
                    </p>
                )}

                <div className="mt-5 rounded-xl border border-[var(--ok-line)] bg-white p-3.5">
                    <p className="text-[12.5px] font-bold text-[var(--ok-ink)]">{t('whatIsCodeTitle')}</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-[var(--ok-muted)]">{t('whatIsCodeBody')}</p>
                </div>

                <button
                    onClick={connect}
                    disabled={connecting}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ok-purple)] py-4 text-[15px] font-bold text-white transition active:scale-[.99] disabled:opacity-60"
                >
                    {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('connect')}
                </button>

                {editing && (
                    <button onClick={() => { setEditing(false); setError(''); }}
                        className="mt-2.5 w-full rounded-xl border border-[var(--ok-line)] py-3 text-[14px] font-semibold text-[var(--ok-body)]">
                        {t('cancel')}
                    </button>
                )}
            </div>
        );
    }

    // ── Bağlı → durum ekranı ─────────────────────────────────────────────
    const used = company.usedCredits;
    const total = company.monthlyCredits;
    const percent = total > 0 ? Math.round((used / total) * 100) : 0;
    const warning = percent >= 80;
    const resetDate = new Date(company.lastResetDate);
    const nextReset = new Date(resetDate.getFullYear(), resetDate.getMonth() + 1, resetDate.getDate());

    return (
        <>
            <div className="mx-auto w-full max-w-lg px-4 pb-28 pt-5">
                <h1 className="mb-4 text-[22px] font-bold tracking-[-.02em] text-[var(--ok-ink)]">{t('title')}</h1>

                {/* Firma kodu — en üstte, mor çerçeveli */}
                <section className="rounded-xl border-[1.5px] border-[var(--ok-purple)] bg-white p-4">
                    <div className="flex items-center justify-between">
                        <span className="ok-mono text-[10px] text-[var(--ok-muted)]">{t('companyCode')}</span>
                        <span className="ok-mono flex items-center gap-1 rounded-[5px] bg-[var(--ok-green-tint)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--ok-green)]">
                            <ShieldCheck className="h-3 w-3" />
                            {t('connected')}
                        </span>
                    </div>
                    <p className="mt-1.5 font-mono text-[24px] font-bold tracking-[.08em] text-[var(--ok-ink)]">{company.code}</p>
                    <p className="mt-1 text-[13.5px] font-semibold text-[var(--ok-ink)]">{company.name}</p>
                    <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--ok-muted)]">{t('codeWarning')}</p>
                    <button onClick={() => setConfirmChange(true)}
                        className="mt-3 flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--ok-purple)]">
                        <Pencil className="h-3.5 w-3.5" />
                        {t('changeCode')}
                    </button>
                </section>

                {/* Kota — kodun hemen altında, mor kimlikte */}
                <button onClick={() => setShowUsage(true)}
                    className={`mt-3 w-full rounded-xl border bg-white p-4 text-left ${warning ? 'border-[rgba(201,138,0,.5)]' : 'border-[var(--ok-line)]'}`}>
                    <div className="flex items-center justify-between">
                        <span className={`text-[13.5px] font-bold ${warning ? 'text-[#5C4200]' : 'text-[var(--ok-ink)]'}`}>
                            {t('quotaTitle', { count: company.remainingScans })}
                        </span>
                        <span className="flex items-center gap-0.5 text-[12px] font-semibold text-[var(--ok-purple)]">
                            {t('detail')} <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                    </div>
                    <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[var(--ok-surface)]">
                        <div className={`h-full rounded-full ${warning ? 'bg-[#C98A00]' : 'bg-[var(--ok-purple)]'}`}
                            style={{ width: `${Math.min(100, Math.max(2, percent))}%` }} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-[var(--ok-muted)]">
                        <span className="tabular-nums">{t('quotaUsage', { used, total })}</span>
                        <span>{t('renewsOn', { date: nextReset.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) })}</span>
                    </div>
                </button>

                {/* Uygulama */}
                <h2 className="ok-mono mb-2 mt-6 px-0.5 text-[10px] text-[var(--ok-muted)]">{t('appSection')}</h2>
                <div className="overflow-hidden rounded-xl border border-[var(--ok-line)] bg-white">
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--ok-line)] px-3.5 py-3">
                        <span className="flex items-center gap-2.5 text-[13.5px] font-medium text-[var(--ok-ink)]">
                            <Languages className="h-4 w-4 text-[var(--ok-muted)]" />
                            {t('language')}
                        </span>
                        {/* Dil anında uygulanır — ayrı kaydet yok */}
                        <Select value={locale} onValueChange={(v) => void setLocale(v)}>
                            <SelectTrigger className="h-8 w-[130px] border-0 bg-transparent text-[13px] font-semibold shadow-none">
                                <SelectValue placeholder={LOCALE_NAMES[locale]} />
                            </SelectTrigger>
                            <SelectContent>
                                {LOCALES.map(l => <SelectItem key={l} value={l}>{LOCALE_NAMES[l]}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {SUPPORT_EMAIL ? (
                        <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Okibo · ${company.code}`)}`}
                            className="flex items-center justify-between px-3.5 py-3">
                            <span className="flex items-center gap-2.5 text-[13.5px] font-medium text-[var(--ok-ink)]">
                                <LifeBuoy className="h-4 w-4 text-[var(--ok-muted)]" />
                                {t('support')}
                            </span>
                            <ChevronRight className="h-4 w-4 text-[var(--ok-faint)]" />
                        </a>
                    ) : (
                        <div className="flex items-start gap-2.5 px-3.5 py-3">
                            <LifeBuoy className="mt-px h-4 w-4 shrink-0 text-[var(--ok-muted)]" />
                            <span className="text-[12.5px] leading-snug text-[var(--ok-muted)]">{t('supportFallback')}</span>
                        </div>
                    )}
                </div>

                <Link href="/admin/login"
                    className="mt-4 flex items-center justify-center gap-1.5 text-[12px] font-medium text-[var(--ok-muted-2)]">
                    <LogIn className="h-3.5 w-3.5" />
                    {t('adminPanel')}
                </Link>
            </div>

            {/* Çıkış ve sürüm alt barda sabit */}
            <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-[var(--ok-line)] bg-white px-4 pb-2 pt-2.5">
                <div className="mx-auto w-full max-w-lg">
                    <button onClick={disconnect}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--ok-line)] py-3 text-[14px] font-semibold text-[var(--ok-danger)]">
                        <LogOut className="h-4 w-4" />
                        {t('logout')}
                    </button>
                    <p className="ok-mono mt-2 text-center text-[9px] text-[var(--ok-faint)]">
                        {t('versionLine', {
                            version: APP_VERSION,
                            time: lastSync ? lastSync.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—',
                        })}
                    </p>
                </div>
            </div>

            {showUsage && <UsageDetail code={company.code} onClose={() => setShowUsage(false)} />}

            {/* Kod değişikliği onaydan geçer */}
            <AlertDialog open={confirmChange} onOpenChange={setConfirmChange}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('changeConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('changeConfirmBody')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { setDraftCode(company.code); setEditing(true); }}>
                            {t('changeCode')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

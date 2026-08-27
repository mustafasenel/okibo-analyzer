'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Loader2, Camera } from 'lucide-react';

import ImageSheet from '@/components/review/ImageSheet';
import InvoiceTable from '@/components/review/InvoiceTable';
import CellDetailSheet from '@/components/review/CellDetailSheet';
import SavedScreen from '@/components/review/SavedScreen';
import { saveInvoice, checkUsageLimit, incrementScanCount } from './actions';
import { analyzeImage, uploadImage, normalizePageItems, UploadedImageInfo } from '@/lib/scan';
import { findSuspiciousCells, totalsMismatch, cellKey, type SuspicionField, type SuspicionReason } from '@/lib/suspicion';
import { metaLabel } from '@/lib/invoice-labels';
import type { InvoiceData, InvoiceItem, InvoiceMeta, InvoiceSummary } from '@/types/invoice';

interface InvoicePage { page: number; items: InvoiceItem[] }

const money = (v: unknown) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0').replace(',', '.'));
    if (!isFinite(n)) return '—';
    return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €';
};

export default function ReviewPage() {
    const t = useTranslations('ReviewPage');
    const router = useRouter();

    const [invoiceMeta, setInvoiceMeta] = useState<InvoiceMeta | null>(null);
    const [invoiceData, setInvoiceData] = useState<InvoicePage[]>([]);
    const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(null);
    const [invoiceImages, setInvoiceImages] = useState<UploadedImageInfo[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [flagged, setFlagged] = useState<Set<string>>(new Set());
    const [detail, setDetail] = useState<{ row: number; field: SuspicionField } | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false);
    const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isRescanning, setIsRescanning] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const resultJson = sessionStorage.getItem('analysisResult');
        const imagesJson = sessionStorage.getItem('invoiceImages');
        const viewId = sessionStorage.getItem('editingInvoiceId');

        if (viewId && !resultJson) {
            setIsViewMode(true);
            setViewInvoiceId(viewId);
            fetch(`/api/invoices/${viewId}`)
                .then(r => r.json())
                .then(data => {
                    if (!data.success || !data.invoice) throw new Error('yok');
                    setInvoiceData(data.invoice.invoiceData);
                    setInvoiceMeta(data.invoice.invoiceMeta);
                    setInvoiceSummary(data.invoice.invoiceSummary);
                    return fetch(`/api/invoices/images?invoiceId=${viewId}`);
                })
                .then(r => r.json())
                .then(d => { if (d.success && d.images) setInvoiceImages(d.images); })
                .catch(() => router.replace('/history'));
        } else {
            if (viewId) sessionStorage.removeItem('editingInvoiceId');
            if (imagesJson) setInvoiceImages(JSON.parse(imagesJson));
            if (resultJson) {
                try {
                    const parsed: InvoiceData = JSON.parse(resultJson);
                    setInvoiceData(parsed.invoiceData);
                    setInvoiceMeta(parsed.invoiceMeta);
                    setInvoiceSummary(parsed.invoiceSummary);
                } catch { router.replace('/'); }
            } else {
                router.replace('/');
            }
        }
    }, [router]);

    // Şüpheli hücreler ve toplam uyuşmazlığı
    const suspicious = useMemo(() => {
        const map = new Map<string, SuspicionReason>();
        findSuspiciousCells(invoiceData).forEach(c => {
            const key = cellKey(c.page, c.row, c.field);
            if (!map.has(key)) map.set(key, c.reason);
        });
        return map;
    }, [invoiceData]);

    const totals = useMemo(
        () => totalsMismatch(invoiceData, invoiceSummary?.total_net ?? invoiceSummary?.Zwischensumme),
        [invoiceData, invoiceSummary]
    );

    const items = invoiceData[currentPage]?.items ?? [];
    const totalItems = invoiceData.reduce((s, p) => s + (p.items?.length ?? 0), 0);

    // Sayfayı yeniden çek (uyuşmazlık çözümlerinden biri)
    const rescanPage = () => {
        if (isRescanning || isViewMode) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            const companyCode = localStorage.getItem('companyCode');
            if (!file || !companyCode) return;
            setError('');
            setIsRescanning(true);
            try {
                const limit = await checkUsageLimit(companyCode, 1);
                if (!limit.success) { setError(limit.message); return; }
                const result = await analyzeImage(file, companyCode);
                setInvoiceData(prev => {
                    const next = [...prev];
                    if (next[currentPage]) next[currentPage] = { ...next[currentPage], items: normalizePageItems(result.invoice_data || []) };
                    return next;
                });
                if (currentPage === 0 && result.invoice_meta) setInvoiceMeta(result.invoice_meta);
                if (result.invoice_summary) setInvoiceSummary(result.invoice_summary);
                const uploaded = await uploadImage(file);
                setInvoiceImages(prev => { const n = [...prev]; n[currentPage] = uploaded; return n; });
                await incrementScanCount(companyCode, 1);
            } catch {
                setError(t('rescanError'));
            } finally {
                setIsRescanning(false);
            }
        };
        input.click();
    };

    const buildFlaggedPayload = (keys: Set<string>) =>
        [...keys].map(key => {
            const [page, row, field] = key.split(':');
            const item = invoiceData[Number(page)]?.items?.[Number(row)];
            return {
                page: Number(page) + 1,
                row: Number(row) + 1,
                field,
                reason: suspicious.get(key) ?? 'manual',
                product: item?.ArtikelBez ?? '',
                articleNumber: item?.ArtikelNumber ?? '',
                value: item ? (item as any)[field] : null,
            };
        });

    const persist = async (keys: Set<string>) => {
        const companyCode = localStorage.getItem('companyCode');
        if (!companyCode) { setError(t('noCompanyCode')); return; }
        setSaving(true);
        try {
            const res = await saveInvoice(
                {
                    invoiceMeta,
                    invoiceData,
                    invoiceSummary,
                    images: invoiceImages,
                    flaggedCells: buildFlaggedPayload(keys),
                },
                companyCode
            );
            if (res.success) {
                sessionStorage.removeItem('analysisResult');
                sessionStorage.removeItem('invoiceImages');
                setFlagged(keys);
                setSaved(true);
            } else {
                setError(res.error || t('saveError'));
            }
        } catch {
            setError(t('saveError'));
        } finally {
            setSaving(false);
        }
    };

    const confirmAndSave = () => persist(flagged);
    const sendAllToDesktop = () => persist(new Set([...flagged, ...suspicious.keys()]));

    const leave = (to: string) => {
        sessionStorage.removeItem('analysisResult');
        sessionStorage.removeItem('invoiceImages');
        sessionStorage.removeItem('editingInvoiceId');
        router.push(to);
    };

    if (invoiceData.length === 0) {
        return (
            <div className="flex h-screen flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--ok-purple)]" />
                <p className="mt-4 text-[13px] text-[var(--ok-muted)]">{t('loading')}</p>
            </div>
        );
    }

    if (saved) {
        return (
            <SavedScreen
                invoiceNo={String(invoiceMeta?.Rechnungsnummer ?? '—')}
                itemCount={totalItems}
                pageCount={invoiceData.length}
                flaggedCount={flagged.size}
                creditsUsed={invoiceData.length}
                summary={invoiceSummary}
                lineTotal={totals.lineTotal}
                mismatched={totals.mismatched}
                meta={(invoiceMeta ?? {}) as Record<string, string | number>}
                onNewScan={() => leave('/')}
                onHistory={() => leave('/history')}
            />
        );
    }

    const detailItem = detail ? items[detail.row] : null;
    const detailKey = detail ? cellKey(currentPage, detail.row, detail.field) : '';

    return (
        <div className={`min-h-full bg-[var(--ok-surface)] ${isViewMode ? "pb-44" : suspicious.size > 0 ? "pb-[15rem]" : "pb-[12rem]"}`}>
            {/* Başlık */}
            <header className="flex items-center gap-3 border-b border-[rgba(20,18,28,.07)] bg-[var(--ok-surface)] px-4 pb-3 pt-5">
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-[17px] font-bold tracking-[-.02em] text-[var(--ok-ink)]">
                        {String(invoiceMeta?.Firma ?? t('title'))}
                    </h1>
                    <p className="mt-px truncate text-[11.5px] text-[var(--ok-muted)]">
                        {[invoiceMeta?.Rechnungsnummer, invoiceMeta?.Rechnungsdatum].filter(Boolean).join(' · ')}
                        {invoiceData.length > 0 && ` · ${t('pageCount', { count: invoiceData.length })}`}
                    </p>
                </div>
                <button onClick={() => setIsSheetOpen(true)} disabled={invoiceImages.length === 0}
                    className="shrink-0 text-[13px] font-semibold text-[var(--ok-purple)] disabled:opacity-40">
                    {t('document')}
                </button>
            </header>

            <div className="flex flex-col gap-3 px-4 pt-3">
                {error && (
                    <p className="rounded-xl border border-[rgba(168,33,92,.25)] bg-[#FCEEF4] px-3.5 py-3 text-[13px] font-medium text-[var(--ok-danger)]">
                        {error}
                    </p>
                )}

                {/* Uyuşmazlık en üstte — kaydetmeden önce görülür */}
                {totals.mismatched && (
                    <div className="flex flex-col gap-2.5 rounded-xl border-[1.5px] border-[#C98A00] bg-[#FDF8EC] p-3.5">
                        <div className="flex items-center gap-2">
                            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#C98A00] text-[11px] font-bold text-white">!</span>
                            <span className="text-[13.5px] font-bold text-[#5C4200]">{t('mismatchTitle')}</span>
                        </div>
                        <p className="text-[12px] leading-relaxed text-[#5C4200]">
                            {t.rich('mismatchBody', {
                                line: money(totals.lineTotal),
                                stated: money(totals.stated),
                                diff: money(Math.abs(totals.difference)),
                                b: (c) => <strong>{c}</strong>,
                            })}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    const first = [...suspicious.keys()][0];
                                    if (!first) return;
                                    const [p, r, f] = first.split(':');
                                    setCurrentPage(Number(p));
                                    setDetail({ row: Number(r), field: f as SuspicionField });
                                }}
                                className="flex-1 rounded-lg bg-[rgba(201,138,0,.18)] py-2.5 text-[12px] font-bold text-[#5C4200]"
                            >
                                {t('inspectDifference')}
                            </button>
                            {!isViewMode && (
                                <button onClick={rescanPage} disabled={isRescanning}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[rgba(201,138,0,.5)] py-2.5 text-[12px] font-bold text-[#5C4200] disabled:opacity-50">
                                    {isRescanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                                    {t('rescanPage')}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Şüpheli hücre bilgisi */}
                {suspicious.size > 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-[rgba(20,18,28,.12)] bg-white px-3.5 py-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--ok-amber-tint)] text-[11px] font-bold text-[var(--ok-amber)]">
                            {suspicious.size}
                        </span>
                        <p className="text-[12.5px] leading-snug text-[var(--ok-body)]">{t('suspiciousNote')}</p>
                    </div>
                )}

                {/* Kalemler + sayfa gezinme */}
                <div className="flex items-center justify-between">
                    <span className="ok-mono text-[10.5px] tracking-[.12em] text-[var(--ok-muted)]">
                        {t('itemsLabel', { count: items.length })}
                    </span>
                    {invoiceData.length > 1 && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(i => Math.max(0, i - 1))} disabled={currentPage === 0}
                                className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[rgba(20,18,28,.15)] bg-white text-[var(--ok-muted-2)] disabled:opacity-40">‹</button>
                            <span className="text-[11.5px] font-semibold text-[var(--ok-body)]">
                                {t('pageOf', { current: currentPage + 1, total: invoiceData.length })}
                            </span>
                            <button onClick={() => setCurrentPage(i => Math.min(invoiceData.length - 1, i + 1))} disabled={currentPage === invoiceData.length - 1}
                                className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[rgba(20,18,28,.15)] bg-white disabled:opacity-40">›</button>
                        </div>
                    )}
                </div>

                <InvoiceTable
                    items={items}
                    page={currentPage}
                    suspicious={suspicious}
                    flagged={flagged}
                    onCellPress={(row, field) => setDetail({ row, field })}
                />

                <div className="flex items-center justify-between pb-2 text-[12px] text-[var(--ok-body)]">
                    <span>{t('lineTotal', { count: totalItems })}</span>
                    <span className="font-bold tabular-nums text-[var(--ok-ink)]">{money(totals.lineTotal)}</span>
                </div>
            </div>

            {/* Tek satır alt bar — içeriği kesmez, FAB yok */}
            <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-[var(--ok-line)] bg-white px-4 pb-3 pt-3">
                <div className="mx-auto flex max-w-lg flex-col gap-2">
                    {isViewMode ? (
                        <button onClick={() => leave('/history')}
                            className="rounded-xl border border-[var(--ok-line)] py-3.5 text-[14.5px] font-semibold text-[var(--ok-body)]">
                            {t('backToHistory')}
                        </button>
                    ) : (
                        <>
                            <button onClick={confirmAndSave} disabled={saving}
                                className="flex items-center justify-center gap-2 rounded-xl bg-[var(--ok-purple)] py-4 text-[15.5px] font-bold text-white transition active:scale-[.99] disabled:opacity-60">
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {saving ? t('saving') : t('confirmSave')}
                            </button>
                            {suspicious.size > 0 && (
                                <button onClick={sendAllToDesktop} disabled={saving}
                                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--ok-line)] py-3 text-[13.5px] font-semibold text-[var(--ok-body)] disabled:opacity-60">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    {t('fixOnDesktop', { count: suspicious.size })}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {detail && detailItem && (
                <CellDetailSheet
                    invoiceLabel={[invoiceMeta?.Rechnungsnummer, invoiceMeta?.Rechnungsdatum].filter(Boolean).join(' · ')}
                    productName={detailItem.ArtikelBez || '—'}
                    fieldLabel={metaLabel(detail.field).label}
                    page={currentPage + 1}
                    row={detail.row + 1}
                    reason={suspicious.get(detailKey) ?? null}
                    readValue={(() => {
                        const raw = (detailItem as any)[detail.field];
                        if (raw === undefined || raw === null || raw === '') return '—';
                        return typeof raw === 'number'
                            ? new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(raw)
                            : String(raw);
                    })()}
                    imageUrl={invoiceImages[currentPage]?.url}
                    flagged={flagged.has(detailKey)}
                    onFlag={() => {
                        setFlagged(prev => {
                            const next = new Set(prev);
                            next.has(detailKey) ? next.delete(detailKey) : next.add(detailKey);
                            return next;
                        });
                        setDetail(null);
                    }}
                    onAccept={() => setDetail(null)}
                    onClose={() => setDetail(null)}
                />
            )}

            <ImageSheet
                images={invoiceImages.map(i => i.url)}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                invoiceId={viewInvoiceId || undefined}
            />
        </div>
    );
}

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Settings2, Loader2, ListOrdered, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import ImageCapture from '@/components/scanner/ImageCapture';
import ImageLightbox from '@/components/scanner/ImageLightbox';
import PageOrderSheet from '@/components/scanner/PageOrderSheet';
import AnalysisScreen from '@/components/scanner/AnalysisScreen';
import { analyzeImage, uploadImage, normalizePageItems, UploadedImageInfo } from '@/lib/scan';
import { expandFilesToImages, isPdf, type ExpandedPage } from '@/lib/pdf';
import { assessSharpness } from '@/lib/quality';
import { rotateImageFile } from '@/lib/image';
import { checkUsageLimit, incrementScanCount } from '@/app/review/actions';
import { useCompanyCode } from '@/hooks/use-company-code';
import type { ScanPage } from '@/types/scan';

/** Sayfa başına kaba süre tahmini (ilk gerçek ölçüm gelene kadar).
 *  Ölçümler ~15-25 sn arasında; olduğundan az göstermek "takıldı" hissi verdiği için
 *  üst sınıra yakın, temkinli bir değer kullanıyoruz. */
const SECONDS_PER_PAGE = 22;
/** Tahmine eklenen güvenlik payı (az göstermektense biraz fazla göster) */
const ETA_MARGIN = 1.2;
/** Aynı anda okunan sayfa sayısı.
 *  Ölçüm (6 sayfa): 1 → 25,8 sn · 2 → 12,8 sn · 5 → 5,3 sn, hata ve hız limiti yok.
 *  Sayfa başı süre bozulmadığı için 5 güvenli. */
const CONCURRENCY = 5;

export default function Home() {
    const t = useTranslations('HomePage');
    const tGuard = useTranslations('CompanyGuard');
    const router = useRouter();
    const { canScan, company } = useCompanyCode();

    const [pages, setPages] = useState<ScanPage[]>([]);
    const [showOrder, setShowOrder] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
    const [isPreparing, setIsPreparing] = useState(false);
    const [prepareMessage, setPrepareMessage] = useState('');
    const [error, setError] = useState('');
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    // Döngü içinde güncel listeyi okumak için ayna
    const pagesRef = useRef<ScanPage[]>([]);
    pagesRef.current = pages;
    const cancelRef = useRef(false);
    // React state render'a bağlı olduğu için, akış kararları senkron bu kayıtlardan verilir
    const outcomesRef = useRef<Map<string, { ok: boolean; result?: any; itemCount?: number; durationMs?: number }>>(new Map());
    const analysisListRef = useRef<ScanPage[]>([]);
    const abortRef = useRef<AbortController | null>(null);
    const recaptureIdRef = useRef<string | null>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const multiplier = company?.creditMultiplier && company.creditMultiplier > 0 ? company.creditMultiplier : 1;
    const creditCost = pages.length * multiplier;
    const estimatedSeconds = Math.max(SECONDS_PER_PAGE, Math.ceil((pages.length * SECONDS_PER_PAGE * ETA_MARGIN) / CONCURRENCY));

    const patch = (id: string, data: Partial<ScanPage>) =>
        setPages(prev => prev.map(p => (p.id === id ? { ...p, ...data } : p)));

    // ── Dosya ekleme (PDF sayfalara ayrılır, netlik ölçülür) ─────────────
    const addFiles = async (fileList: FileList | null) => {
        const replaceId = recaptureIdRef.current;
        recaptureIdRef.current = null;
        if (!fileList || fileList.length === 0) return;
        setError('');

        // Her giriş bir sayfadır: görsel her zaman var, metin yalnızca
        // kopyalanabilir PDF'lerde dolar.
        let incoming: ExpandedPage[] = Array.from(fileList).map(file => ({ file }));
        if (Array.from(fileList).some(isPdf)) {
            setIsPreparing(true);
            setPrepareMessage(t('pdfPreparing'));
            try {
                const { images, errors } = await expandFilesToImages(Array.from(fileList), ({ current, total }) =>
                    setPrepareMessage(t('pdfProcessingPage', { current, total }))
                );
                if (errors.length > 0) setError(errors.join(' '));
                incoming = images;
            } finally {
                setIsPreparing(false);
                setPrepareMessage('');
            }
        }
        if (incoming.length === 0) return;

        setIsPreparing(true);
        setPrepareMessage(t('checkingQuality'));
        const stamp = Date.now();
        const built: ScanPage[] = [];
        for (let i = 0; i < incoming.length; i++) {
            const { file, text } = incoming[i];
            // Metin katmanından okunacak sayfada bulanıklık uyarısı anlamsız —
            // görüntü kalitesi okumayı etkilemiyor.
            const { label } = text ? { label: 'sharp' as const } : await assessSharpness(file);
            built.push({
                id: `${file.name}-${stamp}-${i}`,
                file,
                preview: URL.createObjectURL(file),
                sharpness: label,
                status: 'idle',
                ...(text ? { text } : {}),
            });
        }
        setIsPreparing(false);
        setPrepareMessage('');

        if (replaceId) {
            setPages(prev => prev.map(p => {
                if (p.id !== replaceId) return p;
                URL.revokeObjectURL(p.preview);
                return built[0];
            }));
        } else {
            setPages(prev => [...prev, ...built]);
        }
    };

    const openCamera = () => cameraInputRef.current?.click();
    const openFiles = () => fileInputRef.current?.click();
    const recapture = (id: string) => { recaptureIdRef.current = id; cameraInputRef.current?.click(); };

    const removePage = (id: string) => setPages(prev => {
        const target = prev.find(p => p.id === id);
        if (target) URL.revokeObjectURL(target.preview);
        return prev.filter(p => p.id !== id);
    });

    const rotatePage = async (id: string) => {
        const page = pagesRef.current.find(p => p.id === id);
        if (!page) return;
        setBusyId(id);
        try {
            const rotated = await rotateImageFile(page.file, 90);
            URL.revokeObjectURL(page.preview);
            const { label } = await assessSharpness(rotated);
            patch(id, { file: rotated, preview: URL.createObjectURL(rotated), sharpness: label });
        } finally {
            setBusyId(null);
        }
    };

    const reorder = (from: number, to: number) =>
        setPages(prev => {
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });

    // ── Analiz: sayfalar sırayla okunur (sırada → okunuyor → bitti/hatalı) ──
    const readPage = async (page: ScanPage, companyCode: string, durations: number[]) => {
        patch(page.id, { status: 'reading' });
        const started = performance.now();
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const result = await analyzeImage(page.file, companyCode, controller.signal, page.text);
            const durationMs = performance.now() - started;
            durations.push(durationMs);
            const itemCount = Array.isArray(result?.invoice_data) ? result.invoice_data.length : 0;
            outcomesRef.current.set(page.id, { ok: true, result, itemCount, durationMs });
            patch(page.id, { status: 'done', result, itemCount, durationMs });
        } catch (err) {
            if ((err as any)?.name === 'AbortError') throw err;
            console.error('Sayfa okunamadı:', err);
            outcomesRef.current.set(page.id, { ok: false });
            patch(page.id, { status: 'failed' });
        } finally {
            abortRef.current = null;
            // Ölçülen sürelerden kalan süre tahmini
            const list = analysisListRef.current;
            const settled = list.filter(p => outcomesRef.current.has(p.id)).length;
            const remaining = Math.max(0, list.length - settled);
            if (remaining <= 0) {
                setEtaSeconds(null);
            } else if (durations.length > 0) {
                // Gerçek ölçümden: aynı anda CONCURRENCY sayfa okunduğu için kalan süre bölünür
                const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
                setEtaSeconds(Math.ceil((avg * remaining * ETA_MARGIN) / (CONCURRENCY * 1000)));
            } else {
                // Henüz ölçüm yok — kaba tahminde kal
                setEtaSeconds(Math.ceil((SECONDS_PER_PAGE * remaining * ETA_MARGIN) / CONCURRENCY));
            }
        }
    };

    const startAnalysis = async () => {
        const companyCode = localStorage.getItem('companyCode');
        if (!companyCode || !canScan) { setError(tGuard('lockedDescription')); return; }
        if (pages.length === 0) { setError(t('errorNoImages')); return; }

        const limit = await checkUsageLimit(companyCode, pages.length);
        if (!limit.success) { setError(limit.message); return; }

        setError('');
        setShowOrder(false);
        setAnalyzing(true);
        cancelRef.current = false;
        setEtaSeconds(estimatedSeconds);
        setPages(prev => prev.map(p => ({ ...p, status: 'queued', result: undefined, itemCount: undefined, durationMs: undefined })));

        const list = pagesRef.current;
        analysisListRef.current = list;
        outcomesRef.current = new Map();

        // Aynı anda en fazla 2 sayfa okunur: "sırada" durumu ve gerçek ETA korunur,
        // toplam süre tek tek okumaya göre yarıya iner.
        const durations: number[] = [];
        const queue = [...list];
        const worker = async () => {
            while (queue.length > 0) {
                if (cancelRef.current) return;
                const page = queue.shift();
                if (!page) return;
                await readPage(page, companyCode, durations);
            }
        };
        try {
            await Promise.all(Array.from({ length: CONCURRENCY }, worker));
        } catch {
            return; // iptal edildi
        }
        if (cancelRef.current) return;

        if (list.every(p => outcomesRef.current.get(p.id)?.ok)) {
            await saveAndContinue(companyCode);
        }
        // Hatalı sayfa varsa kullanıcı analiz ekranında tekrar dener ya da devam eder
    };

    const retryPage = async (id: string) => {
        const companyCode = localStorage.getItem('companyCode');
        const page = analysisListRef.current.find(p => p.id === id);
        if (!companyCode || !page) return;
        try {
            await readPage(page, companyCode, []);
        } catch {
            return;
        }
        if (analysisListRef.current.every(p => outcomesRef.current.get(p.id)?.ok)) {
            await saveAndContinue(companyCode);
        }
    };

    // Okunan sayfalarla devam: görseller yüklenir, kredi sadece okunan sayfalar için düşer
    const saveAndContinue = async (companyCode: string) => {
        const done = analysisListRef.current
            .map(p => ({ page: p, outcome: outcomesRef.current.get(p.id) }))
            .filter(x => x.outcome?.ok)
            .map(x => ({ ...x.page, result: x.outcome!.result }));
        if (done.length === 0) {
            setAnalyzing(false);
            setError(t('errorAnalysisFailed'));
            return;
        }

        setSaving(true);
        const invoiceMeta = done.find(p => p.result?.invoice_meta)?.result?.invoice_meta ?? {};
        const invoiceSummary = [...done].reverse().find(p => p.result?.invoice_summary)?.result?.invoice_summary ?? null;
        const invoiceData = done.map((p, index) => ({
            page: index + 1,
            items: normalizePageItems(p.result?.invoice_data || []),
        }));
        sessionStorage.setItem('analysisResult', JSON.stringify({ invoiceMeta, invoiceData, invoiceSummary }));

        const uploaded: UploadedImageInfo[] = [];
        for (const page of done) {
            try {
                uploaded.push(await uploadImage(page.file));
            } catch (err) {
                console.error('Görsel yüklenemedi:', err);
            }
        }
        sessionStorage.setItem('invoiceImages', JSON.stringify(uploaded));
        sessionStorage.removeItem('editingInvoiceId');

        // Okunamayan sayfanın kredisi alınmaz
        await incrementScanCount(companyCode, done.length);
        router.push('/review');
    };

    const cancelAnalysis = () => {
        cancelRef.current = true;
        abortRef.current?.abort();
        setAnalyzing(false);
        setSaving(false);
        setEtaSeconds(null);
        setPages(prev => prev.map(p => ({ ...p, status: 'idle' })));
    };

    // ── Tam ekran analiz ─────────────────────────────────────────────────
    if (analyzing) {
        return (
            <AnalysisScreen
                pages={pages}
                saving={saving}
                etaSeconds={etaSeconds}
                onCancel={cancelAnalysis}
                onRetryPage={retryPage}
                onContinue={
                    !saving && pages.every(p => p.status === 'done' || p.status === 'failed') && pages.some(p => p.status === 'failed')
                        ? () => { const c = localStorage.getItem('companyCode'); if (c) void saveAndContinue(c); }
                        : undefined
                }
            />
        );
    }

    return (
        <div className="min-h-full bg-[var(--ok-surface)] pb-32">
            {/* Gizli girdiler — kamera işletim sisteminden açılır */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
                onChange={e => { void addFiles(e.target.files); e.target.value = ''; }} />
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.pdf" multiple className="hidden"
                onChange={e => { void addFiles(e.target.files); e.target.value = ''; }} />

            {/* Başlık */}
            <header className="mx-auto w-full max-w-lg flex items-center gap-3 px-4 pb-4 pt-5">
                <Image src="/icons/icon-192x192.png" alt="" width={38} height={38}
                    className="rounded-[10px] border border-[var(--ok-line)] bg-white" />
                <div className="min-w-0 flex-1">
                    <h1 className="text-[17px] font-bold leading-tight text-[var(--ok-ink)]">{t('title')}</h1>
                    <p className="truncate text-[12px] text-[var(--ok-muted)]">
                        {company?.name ?? tGuard('lockedTitle')}
                    </p>
                </div>
                {company && (
                    <div className="flex shrink-0 items-baseline gap-1 rounded-full border border-[var(--ok-line)] bg-white px-3 py-1.5">
                        <span className="text-[15px] font-bold tabular-nums text-[var(--ok-ink)]">{company.remainingCredits}</span>
                        <span className="ok-mono text-[9px] text-[var(--ok-muted)]">{t('creditLabel')}</span>
                    </div>
                )}
            </header>

            <div className="mx-auto w-full max-w-lg px-4">
                {canScan ? (
                    <ImageCapture onCamera={openCamera} onFiles={openFiles} disabled={isPreparing} />
                ) : (
                    <div className="rounded-xl border border-dashed border-[var(--ok-faint)] bg-white p-8 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[14px] bg-[var(--ok-surface)]">
                            <Lock className="h-7 w-7 text-[var(--ok-faint)]" />
                        </div>
                        <h2 className="font-bold text-[var(--ok-ink)]">{tGuard('lockedTitle')}</h2>
                        <p className="mx-auto mt-1.5 max-w-xs text-[13px] text-[var(--ok-muted)]">{tGuard('lockedDescription')}</p>
                        <Link href="/settings"
                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--ok-purple)] px-5 py-2.5 text-[13px] font-bold text-white">
                            <Settings2 className="h-4 w-4" />
                            {tGuard('goToSettings')}
                        </Link>
                    </div>
                )}

                {isPreparing && (
                    <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[var(--ok-purple-tint)] px-3 py-2.5 text-[13px] font-semibold text-[var(--ok-purple)]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {prepareMessage}
                    </div>
                )}

                {error && (
                    <p className="mt-3 rounded-xl border border-[rgba(168,33,92,.25)] bg-[#FCEEF4] px-3.5 py-3 text-[13px] font-medium text-[var(--ok-danger)]">
                        {error}
                    </p>
                )}

                {/* Bu fatura · sayfalar */}
                {pages.length > 0 && (
                    <section className="mt-6">
                        <div className="mb-2.5 flex items-center justify-between px-0.5">
                            <span className="ok-mono text-[10px] text-[var(--ok-muted)]">
                                {t('thisInvoice', { count: pages.length })}
                            </span>
                            <button onClick={() => setShowOrder(true)}
                                className="flex items-center gap-1 text-[12px] font-bold text-[var(--ok-purple)]">
                                <ListOrdered className="h-3.5 w-3.5" />
                                {t('editOrder')}
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                            {pages.map((page, index) => (
                                <div key={page.id} className="relative overflow-hidden rounded-xl border border-[var(--ok-line)] bg-white">
                                    <button onClick={() => setLightboxUrl(page.preview)}
                                        className="relative block aspect-[3/4] w-full">
                                        <Image src={page.preview} alt="" fill className="object-cover" unoptimized />
                                    </button>
                                    <button onClick={() => removePage(page.id)}
                                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ok-ink)]/70 text-white backdrop-blur"
                                        aria-label={t('removePage')}>
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                    <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                                        <span className="text-[11.5px] font-bold text-[var(--ok-ink)]">
                                            {t('pageShort', { index: index + 1 })}
                                        </span>
                                        {page.sharpness === 'sharp' && (
                                            <span className="ok-mono rounded-[5px] bg-[var(--ok-green-tint)] px-1 py-0.5 text-[8.5px] font-bold text-[var(--ok-green)]">
                                                {t('sharp')}
                                            </span>
                                        )}
                                        {page.sharpness === 'blurry' && (
                                            <span className="ok-mono rounded-[5px] bg-[var(--ok-amber-tint)] px-1 py-0.5 text-[8.5px] font-bold text-[var(--ok-amber)]">
                                                {t('blurry')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <button onClick={openFiles} disabled={isPreparing}
                                className="flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--ok-faint)] text-[var(--ok-muted)] disabled:opacity-40">
                                <Plus className="h-5 w-5" />
                                <span className="text-[11.5px] font-semibold">{t('addPage')}</span>
                            </button>
                        </div>
                    </section>
                )}
            </div>

            {/* Bitirme eylemi — sabit, maliyeti taşır */}
            {pages.length > 0 && canScan && (
                <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pb-3">
                    <div className="mx-auto max-w-lg">
                        <button onClick={startAnalysis} disabled={isPreparing}
                            className="flex w-full items-center justify-between rounded-xl bg-[var(--ok-ink)] px-5 py-4 text-left text-white shadow-lg shadow-black/10 transition active:scale-[.99] disabled:opacity-50">
                            <span>
                                <span className="block text-[15px] font-bold">{t('startAnalysis')}</span>
                                <span className="mt-0.5 block text-[12px] opacity-70">
                                    {t('startMeta', { pages: pages.length, credits: creditCost, seconds: estimatedSeconds })}
                                </span>
                            </span>
                            <span className="text-lg">→</span>
                        </button>
                    </div>
                </div>
            )}

            {showOrder && (
                <PageOrderSheet
                    pages={pages}
                    creditCost={creditCost}
                    estimatedSeconds={estimatedSeconds}
                    onClose={() => setShowOrder(false)}
                    onReorder={reorder}
                    onRotate={rotatePage}
                    onDelete={removePage}
                    onRecapture={recapture}
                    onAddPages={openFiles}
                    onStart={startAnalysis}
                    busyId={busyId}
                />
            )}

            <ImageLightbox imageUrl={lightboxUrl} onClose={() => setLightboxUrl(null)} />
        </div>
    );
}

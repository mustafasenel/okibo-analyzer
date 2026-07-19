'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReviewDataTabs from '@/components/review/ReviewDataTabs';
import ImageSheet from '@/components/review/ImageSheet';
import { saveInvoice, checkUsageLimit, incrementScanCount } from './actions';
import { analyzeImage, uploadImage, normalizePageItems, UploadedImageInfo } from '@/lib/scan';
import { Check, X, Loader2, FileImage } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { InvoiceData, InvoiceItem, InvoiceMeta, InvoiceSummary } from '@/types/invoice';

interface InvoicePage {
    page: number;
    items: InvoiceItem[];
}

export default function ReviewPage() {
    const t = useTranslations('ReviewPage');
    const router = useRouter();
    const [invoiceMeta, setInvoiceMeta] = useState<InvoiceMeta | null>(null);
    const [invoiceData, setInvoiceData] = useState<InvoicePage[]>([]);
    const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(null);
    const [invoiceImages, setInvoiceImages] = useState<UploadedImageInfo[]>([]);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isSaveDisabled, setIsSaveDisabled] = useState(true);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false); // history'den salt-görüntüleme
    const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRescanning, setIsRescanning] = useState(false);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        const resultJson = sessionStorage.getItem('analysisResult');
        const imagesJson = sessionStorage.getItem('invoiceImages');
        const viewId = sessionStorage.getItem('editingInvoiceId'); // history "görüntüle" bunu set eder

        if (viewId && !resultJson) {
            // Salt-görüntüleme modu: kaydedilmiş faturayı DB'den getir (düzenleme PHP tarafında yapılır)
            setIsViewMode(true);
            setViewInvoiceId(viewId);

            fetch(`/api/invoices/${viewId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.invoice) {
                        setInvoiceData(data.invoice.invoiceData);
                        setInvoiceMeta(data.invoice.invoiceMeta);
                        setInvoiceSummary(data.invoice.invoiceSummary);
                        return fetch(`/api/invoices/images?invoiceId=${viewId}`);
                    }
                    throw new Error('Failed to fetch invoice data');
                })
                .then(response => response.json())
                .then(imageData => {
                    if (imageData.success && imageData.images) {
                        setInvoiceImages(imageData.images);
                    }
                })
                .catch(error => {
                    console.error('Error fetching invoice for view:', error);
                    router.replace('/history');
                });
        } else {
            // Yeni tarama modu
            if (viewId) {
                sessionStorage.removeItem('editingInvoiceId');
            }
            if (imagesJson) {
                setInvoiceImages(JSON.parse(imagesJson));
            }
            if (resultJson) {
                try {
                    const parsedData: InvoiceData = JSON.parse(resultJson);
                    setInvoiceData(parsedData.invoiceData);
                    setInvoiceMeta(parsedData.invoiceMeta);
                    setInvoiceSummary(parsedData.invoiceSummary);
                } catch {
                    router.replace('/');
                }
            } else {
                router.replace('/');
            }
        }

        const savedCompanyCode = localStorage.getItem('companyCode');
        setIsSaveDisabled(!savedCompanyCode);
    }, [router]);

    // --- Sayfayı yeniden tara: yeni görsel çek → analiz et → o sayfanın verisini değiştir ---
    const handleRescanPage = () => {
        if (isRescanning || isViewMode) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = async (e) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) return;

            const companyCode = localStorage.getItem('companyCode');
            if (!companyCode) {
                setError('Firma kodu ayarlanmamış. Lütfen ayarlardan kontrol edin.');
                return;
            }

            setError('');
            setIsRescanning(true);
            try {
                // Yeniden tarama da bir model çağrısıdır → kredi kontrolü
                const limitCheck = await checkUsageLimit(companyCode, 1);
                if (!limitCheck.success) {
                    setError(limitCheck.message);
                    return;
                }

                const result = await analyzeImage(file, companyCode);
                const newItems = normalizePageItems(result.invoice_data || []);

                setInvoiceData(prev => {
                    const next = [...prev];
                    if (next[currentPageIndex]) {
                        next[currentPageIndex] = { ...next[currentPageIndex], items: newItems };
                    }
                    return next;
                });

                // İlk sayfa yeniden tarandıysa meta, son sayfa ise özet güncellenir
                if (currentPageIndex === 0 && result.invoice_meta) {
                    setInvoiceMeta(result.invoice_meta);
                }
                if (currentPageIndex === invoiceData.length - 1 && result.invoice_summary) {
                    setInvoiceSummary(result.invoice_summary);
                }

                // Görseli yükle ve o sayfanın görselini değiştir
                const uploaded = await uploadImage(file);
                setInvoiceImages(prev => {
                    const next = [...prev];
                    next[currentPageIndex] = uploaded;
                    return next;
                });

                await incrementScanCount(companyCode, 1);
            } catch (err) {
                console.error('Yeniden tarama hatası:', err);
                setError('Sayfa yeniden taranırken bir hata oluştu.');
            } finally {
                setIsRescanning(false);
            }
        };
        input.click();
    };

    const handleSaveToDb = async () => {
        const companyCode = localStorage.getItem('companyCode');
        if (!companyCode) return;

        setIsSaving(true);
        try {
            const result = await saveInvoice(
                { invoiceMeta, invoiceData, invoiceSummary, images: invoiceImages },
                companyCode
            );
            if (result.success) {
                setIsSuccessModalOpen(true);
            } else {
                setError(result.error || 'Kaydetme başarısız.');
            }
        } catch (error) {
            console.error('Failed to save to DB:', error);
            setError('Kaydetme sırasında bir hata oluştu.');
        } finally {
            setIsSaving(false);
        }
    };

    const clearSessionAndLeave = (to: string) => {
        sessionStorage.removeItem('analysisResult');
        sessionStorage.removeItem('invoiceImages');
        sessionStorage.removeItem('editingInvoiceId');
        router.push(to);
    };

    const handleDiscard = () => clearSessionAndLeave(isViewMode ? '/history' : '/');
    const handleModalConfirm = () => clearSessionAndLeave('/history');

    const goToNextPage = () => setCurrentPageIndex(i => Math.min(i + 1, invoiceData.length - 1));
    const goToPreviousPage = () => setCurrentPageIndex(i => Math.max(i - 1, 0));

    if (invoiceData.length === 0) {
        return (
            <div className="flex flex-col justify-center items-center h-screen">
                <Loader2 className="animate-spin h-8 w-8 text-violet-600" />
                <p className="mt-4 text-gray-600">{t('loading')}</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4 px-4">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isViewMode ? t('editTitle') : t('title')}
                </h1>
            </div>

            {error && (
                <p className="mx-4 mb-4 text-red-600 text-center font-medium bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            <div className="mb-24 sm:mb-8">
                {invoiceData.length > 0 && invoiceMeta && (
                    <ReviewDataTabs
                        invoiceMeta={invoiceMeta}
                        invoiceSummary={invoiceSummary}
                        invoiceData={invoiceData[currentPageIndex]?.items || []}
                        currentPage={currentPageIndex + 1}
                        totalPages={invoiceData.length}
                        onNextPage={goToNextPage}
                        onPreviousPage={goToPreviousPage}
                        onRescanPage={isViewMode ? undefined : handleRescanPage}
                        isRescanning={isRescanning}
                    />
                )}
            </div>

            {/* Alt aksiyon butonları */}
            <div className="flex gap-4 fixed bottom-20 left-4 right-4 z-10 sm:static">
                <button
                    onClick={handleDiscard}
                    className="flex-1 bg-gray-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-600 shadow-lg"
                >
                    <X className="h-5 w-5" />
                    <span>{isViewMode ? t('discardButton') : t('discardButton')}</span>
                </button>

                {!isViewMode && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex-1">
                                    <button
                                        onClick={handleSaveToDb}
                                        disabled={isSaveDisabled || isSaving || isRescanning}
                                        className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Check className="h-5 w-5" />}
                                        <span>{isSaving ? t('saving') : t('confirmButton')}</span>
                                    </button>
                                </div>
                            </TooltipTrigger>
                            {isSaveDisabled && (
                                <TooltipContent>
                                    <p>{t('companyCodeTooltip')}</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>

            {/* Faturayı görüntüle (float button) */}
            <Button
                variant="outline"
                onClick={() => setIsSheetOpen(true)}
                disabled={invoiceImages.length === 0}
                className="fixed bottom-24 right-4 z-20 h-14 w-14 rounded-full shadow-lg bg-white"
            >
                <FileImage size={24} />
            </Button>

            <ImageSheet
                images={invoiceImages.map(img => img.url)}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                invoiceId={viewInvoiceId || undefined}
            />

            <AlertDialog open={isSuccessModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('saveSuccessTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('saveSuccessDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={handleModalConfirm}>{t('saveSuccessConfirm')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

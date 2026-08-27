'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ImageCapture from '@/components/scanner/ImageCapture';
import { ImagePreviewGrid } from '@/components/scanner/ImagePreviewGrid';
import ImageLightbox from '@/components/scanner/ImageLightbox'; // Lightbox bileşenini import et
import { Loader2, Lock, Settings2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { analyzeImage, uploadImage, normalizePageItems, UploadedImageInfo } from '@/lib/scan';
import { checkUsageLimit, incrementScanCount } from '@/app/review/actions';
import { useCompanyCode } from '@/hooks/use-company-code';
import { expandFilesToImages, isPdf } from '@/lib/pdf';

// --- TYPES ---
type ImageFileStatus = 'pending' | 'processing' | 'completed' | 'error';

interface ImageFileWithStatus {
    file: File;
    id: string;
    preview: string;
    status: ImageFileStatus;
    retries: number; // Deneme sayısını takip etmek için
}

export default function Home() {
    const t = useTranslations('HomePage');
    const tGuard = useTranslations('CompanyGuard');
    const router = useRouter();
    const { canScan, company, status } = useCompanyCode();

    const [imageFiles, setImageFiles] = useState<ImageFileWithStatus[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisMessage, setAnalysisMessage] = useState('');
    const [error, setError] = useState<string>('');
    const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null); // Lightbox için state
    const [isPreparing, setIsPreparing] = useState(false); // PDF sayfalara ayrılırken
    const [prepareMessage, setPrepareMessage] = useState('');

    const handleFilesChange = async (files: FileList | null, idToReplace?: string) => {
        if (!files || files.length === 0) return;
        setError('');

        const selected = Array.from(files);
        let prepared = selected;

        // PDF seçildiyse sayfalarına ayrılıp görsele çevrilir; sonrası mevcut akışla aynıdır.
        if (selected.some(isPdf)) {
            setIsPreparing(true);
            setPrepareMessage(t('pdfPreparing'));
            try {
                const { images, errors } = await expandFilesToImages(selected, ({ current, total }) => {
                    setPrepareMessage(t('pdfProcessingPage', { current, total }));
                });
                if (errors.length > 0) setError(errors.join(' '));
                prepared = images;
            } finally {
                setIsPreparing(false);
                setPrepareMessage('');
            }
        }

        if (prepared.length === 0) return;

        const stamp = Date.now();
        const newFiles = prepared.map((file, index) => ({
            file,
            id: `${file.name}-${stamp}-${index}`,
            preview: URL.createObjectURL(file),
            status: 'pending' as ImageFileStatus,
            retries: 0,
        }));

        if (idToReplace) {
            setImageFiles(prev => prev.map(img => img.id === idToReplace ? newFiles[0] : img));
        } else {
            setImageFiles(prev => [...prev, ...newFiles]);
        }
    };

    const handleRemoveImage = (idToRemove: string) => {
        setImageFiles(prev => prev.filter(image => image.id !== idToRemove));
    };

    const updateImageStatus = (id: string, status: ImageFileStatus) => {
        setImageFiles(prev => prev.map(img => img.id === id ? { ...img, status } : img));
    };

    const handleReplaceImage = (idToReplace: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        // Kamerayı da seçenek olarak sunmak için capture ekleyebiliriz, ancak bu seferlik sadece dosya seçimi
        // input.capture = 'environment'; 
        input.onchange = (e) => {
            const target = e.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
                handleFilesChange(target.files, idToReplace);
            }
        };
        input.click();
    };

    const handlePreviewImage = (id: string) => {
        const image = imageFiles.find(img => img.id === id);
        if (image) {
            setLightboxImageUrl(image.preview);
        }
    };

    const handleSubmit = async () => {
        if (imageFiles.length === 0) {
            setError(t('errorNoImages'));
            return;
        }
        setError('');
        setIsAnalyzing(true);

        const companyCode = localStorage.getItem('companyCode');
        if (!companyCode || !canScan) {
            setError(tGuard('lockedDescription'));
            setIsAnalyzing(false);
            return;
        }
        const limitCheck = await checkUsageLimit(companyCode, imageFiles.length);
        if (!limitCheck.success) {
            setError(limitCheck.message);
            setIsAnalyzing(false);
            return;
        }

        const analysisPromises = imageFiles.map(async (imageFile, index) => {
            try {
                setAnalysisMessage(t('analyzingMessage', { current: index + 1, total: imageFiles.length }));
                updateImageStatus(imageFile.id, 'processing');

                // Model sunucu tarafında companyCode'dan çözülür.
                const result = await analyzeImage(imageFile.file, companyCode);
                updateImageStatus(imageFile.id, 'completed');
                return result;
            } catch (err) {
                console.error(`Failed to process image ${imageFile.id}:`, err);
                updateImageStatus(imageFile.id, 'error');
                return null; // Return null for failed analyses
            }
        });

        const allResults = (await Promise.all(analysisPromises)).filter(res => res !== null);

        if (allResults.length !== imageFiles.length) {
            setError(t('errorAnalysisFailed'));
            setIsAnalyzing(false);
            return;
        }

        // --- AGGREGATION & UPLOAD ---
        setAnalysisMessage(t('aggregatingResults'));
        const finalMeta = allResults[0]?.invoice_meta || {};
        const finalSummary = allResults[allResults.length - 1]?.invoice_summary || null;

        const finalPaginatedData = allResults.map((result, index) => ({
            page: index + 1,
            items: normalizePageItems(result.invoice_data || []),
        }));

        const finalData = { invoiceMeta: finalMeta, invoiceData: finalPaginatedData, invoiceSummary: finalSummary };
        sessionStorage.setItem('analysisResult', JSON.stringify(finalData));

        setAnalysisMessage(t('uploadingImages'));
        const uploadPromises = imageFiles.map(img => uploadImage(img.file).catch(err => {
            console.error(`Failed to upload ${img.file.name}:`, err);
            return null; // Return null on upload failure
        }));
        const uploadedImages = (await Promise.all(uploadPromises)).filter((res): res is UploadedImageInfo => res !== null);

        if (uploadedImages.length !== imageFiles.length) {
            setError(t('errorUploadFailed'));
            setIsAnalyzing(false);
            return;
        }

        sessionStorage.setItem('invoiceImages', JSON.stringify(uploadedImages));
        sessionStorage.removeItem('editingInvoiceId');
        await incrementScanCount(companyCode, imageFiles.length);

        router.push('/review');
    };

    return (
        <div className="p-4 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t('title')}</h1>

            {/* Firma kodu doğrulanmışsa firma adı + kalan kredi rozeti */}
            {canScan && company && (
                <div className="mb-4 flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-2.5">
                    <span className="truncate text-sm font-medium text-gray-700">{company.name}</span>
                    <span className="shrink-0 text-xs font-semibold text-violet-700">
                        {tGuard('creditsLeft', { count: company.remainingCredits })}
                    </span>
                </div>
            )}

            {canScan ? (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <ImageCapture onFilesChange={handleFilesChange} disabled={isAnalyzing || isPreparing} />

                    {/* PDF sayfalara ayrılırken ilerleme */}
                    {isPreparing && (
                        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-700">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>{prepareMessage}</span>
                        </div>
                    )}
                </div>
            ) : (
                /* Firma kodu yok/geçersiz → tarama alanı kilitli */
                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                        <Lock className="h-7 w-7 text-gray-400" />
                    </div>
                    <h2 className="font-semibold text-gray-800">{tGuard('lockedTitle')}</h2>
                    <p className="mx-auto mt-1.5 max-w-xs text-sm text-gray-500">{tGuard('lockedDescription')}</p>
                    <Link
                        href="/settings"
                        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-700 active:scale-[0.98]"
                    >
                        <Settings2 className="h-4 w-4" />
                        {tGuard('goToSettings')}
                    </Link>
                </div>
            )}
            {error && <p className="text-red-600 mt-4 text-center font-semibold bg-red-100 p-3 rounded-md">{error}</p>}
            {imageFiles.length > 0 && (
                <ImagePreviewGrid 
                    images={imageFiles}
                    onRemove={handleRemoveImage}
                    onReplace={handleReplaceImage}
                    onPreview={handlePreviewImage}
                    disabled={isAnalyzing}
                />
            )}
            {imageFiles.length > 0 && (
                <div className="mt-8">
                    <button
                        onClick={handleSubmit}
                        disabled={isAnalyzing || !canScan}
                        className="w-full bg-violet-600 text-white font-bold py-4 px-4 rounded-lg text-lg flex items-center justify-center gap-2 hover:bg-violet-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="animate-spin h-6 w-6" />
                                <span>{analysisMessage}</span>
                            </>
                        ) : (
                            // Buton metnini de dil dosyasından al
                            (t('analyzeButton', { count: imageFiles.length }))
                        )}
                    </button>
                </div>
            )}
            <ImageLightbox 
                imageUrl={lightboxImageUrl}
                onClose={() => setLightboxImageUrl(null)}
            />
        </div>
    );
}

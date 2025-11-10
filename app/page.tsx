'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ImageCapture from '@/components/scanner/ImageCapture';
import { ImagePreviewGrid } from '@/components/scanner/ImagePreviewGrid';
import ImageLightbox from '@/components/scanner/ImageLightbox'; // Lightbox bileşenini import et
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import imageCompression from 'browser-image-compression';
import { checkUsageLimit, incrementScanCount } from '@/app/review/actions';

// --- TYPES ---
type ImageFileStatus = 'pending' | 'processing' | 'completed' | 'error';

interface ImageFileWithStatus {
    file: File;
    id: string;
    preview: string;
    status: ImageFileStatus;
    retries: number; // Deneme sayısını takip etmek için
}

const DEFAULT_MODEL = 'qwen/qwen3-vl-8b-instruct';
const MAX_RETRIES = 3;

interface UploadedImageInfo {
    publicId: string;
    url: string;
    originalName: string;
}

// --- HELPERS ---
const fetchWithRetry = async (url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> => {
    try {
        const response = await fetch(url, options);
        if (!response.ok && response.status >= 500 && retries > 0) {
            console.warn(`Request failed with status ${response.status}. Retrying... (${retries} retries left)`);
            await new Promise(res => setTimeout(res, 1000)); // 1 saniye bekle
            return fetchWithRetry(url, options, retries - 1);
        }
        return response;
    } catch (error) {
        if (retries > 0) {
            console.warn(`Request failed with network error. Retrying... (${retries} retries left)`);
            await new Promise(res => setTimeout(res, 1000));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
};

const uploadFile = async (file: File): Promise<UploadedImageInfo> => {
    const options = { maxSizeMB: 1.5, maxWidthOrHeight: 1920, useWebWorker: true };
    const compressedFile = await imageCompression(file, options);

    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

    const url = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!}/image/upload`;
    const response = await fetchWithRetry(url, { method: 'POST', body: formData });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Cloudinary upload failed: ${errorData.error.message}`);
    }
    const data = await response.json();
    return { publicId: data.public_id, url: data.secure_url, originalName: file.name };
};

export default function Home() {
    const t = useTranslations('HomePage');
    const router = useRouter();
    
    const [imageFiles, setImageFiles] = useState<ImageFileWithStatus[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisMessage, setAnalysisMessage] = useState('');
    const [error, setError] = useState<string>('');
    const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null); // Lightbox için state

    const handleFilesChange = (files: FileList | null, idToReplace?: string) => {
        if (!files) return;
        const newFiles = Array.from(files).map(file => ({
            file,
            id: `${file.name}-${Date.now()}`,
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
        if (!companyCode) {
            setError("Firma kodu ayarlanmamış. Lütfen ayarlardan kontrol edin.");
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

                const formData = new FormData();
                formData.append('image', imageFile.file);
                formData.append('model', DEFAULT_MODEL);

                const response = await fetchWithRetry('/api/analyze', { method: 'POST', body: formData });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Analysis failed');
                }

                const result = await response.json();
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
            items: (result.invoice_data || []).map((item: any) => ({ ...item, originalNetto: item.Netto })),
        }));

        const finalData = { invoiceMeta: finalMeta, invoiceData: finalPaginatedData, invoiceSummary: finalSummary };
        sessionStorage.setItem('analysisResult', JSON.stringify(finalData));

        setAnalysisMessage(t('uploadingImages'));
        const uploadPromises = imageFiles.map(img => uploadFile(img.file).catch(err => {
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
            <div className="bg-white p-6 rounded-lg shadow-md">
                <ImageCapture onFilesChange={handleFilesChange} disabled={isAnalyzing} />
            </div>
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
                        disabled={isAnalyzing}
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

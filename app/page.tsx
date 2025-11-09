'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageCapture from '@/components/scanner/ImageCapture';
import { ImagePreviewGrid } from '@/components/scanner/ImagePreviewGrid';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import imageCompression from 'browser-image-compression';
import { checkUsageLimit, incrementScanCount } from '@/app/review/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ImageFileStatus = 'pending' | 'processing' | 'completed' | 'error';

interface ImageFileWithStatus {
    file: File;
    id: string;
    preview: string;
    status: ImageFileStatus;
}

const MODELS = [
  { id: 'mistralai/mistral-small-3.2-24b-instruct:free', name: 'Mistral Small (Default)' },
  { id: 'qwen/qwen2.5-vl-32b-instruct:free', name: 'Qwen 2.5VL 32B' },
  { id: 'meta-llama/llama-4-maverick:free', name: 'Llama 4 Maverick' },
];

// Gelen JSON verisi için tip tanımı
type InvoiceData = {
  invoice_meta?: Record<string, string | number>;
  invoice_data?: Record<string, string | number>[];
  invoice_summary?: Record<string, string | number>;
};

// Yükleme durumu için tip tanımı
type LoadingState = {
  isLoading: boolean;
  message: string;
};

export default function Home() {
    const t = useTranslations('HomePage');
    const router = useRouter();
    
    const [imageFiles, setImageFiles] = useState<ImageFileWithStatus[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisMessage, setAnalysisMessage] = useState('');
    const [error, setError] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState<string>(MODELS[0].id);

    // ImageCapture component'inden gelen dosyaları işleyen fonksiyon
    const handleFilesChange = (files: FileList | null) => {
      if (files) {
        const newFiles = Array.from(files).map(file => ({
          file,
          id: `${file.name}-${file.lastModified}`,
          preview: URL.createObjectURL(file),
          status: 'pending' as ImageFileStatus,
        }));
        setImageFiles(prevFiles => [...prevFiles, ...newFiles]);
      }
    };

    const handleRemoveImage = (idToRemove: string) => {
      setImageFiles(prevFiles => prevFiles.filter(image => image.id !== idToRemove));
    };

    const updateImageStatus = (id: string, status: ImageFileStatus) => {
      setImageFiles(prevFiles =>
        prevFiles.map(image =>
          image.id === id ? { ...image, status } : image
        )
      );
    };

    const handleRetryImage = async (id: string) => {
        const imageFile = imageFiles.find(f => f.id === id);
        if (!imageFile) return;

        updateImageStatus(id, 'processing');
        
        try {
            const formData = new FormData();
            formData.append('image', imageFile.file);
            formData.append('model', selectedModel);

            const response = await fetch('/api/analyze', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || t('errorApi'));
            }
            
            updateImageStatus(id, 'completed');
        } catch (err: any) {
            console.error("Retry error:", err);
            updateImageStatus(id, 'error');
        }
    };

    // Analiz butonuna basıldığında çalışan ana fonksiyon
    const handleSubmit = async () => {
        if (imageFiles.length === 0) {
            setError(t('errorNoImages'));
            return;
        }
        setError('');
        setIsAnalyzing(true);
        setAnalysisMessage(t('analyzingMessage', { current: 1, total: imageFiles.length }));

        try {
            // 1. Check company code and usage limit before analysis
            const companyCode = localStorage.getItem('companyCode');
            if (!companyCode) {
              throw new Error("Firma kodu ayarlanmamış. Lütfen ayarlardan kontrol edin.");
            }

            const limitCheckResult = await checkUsageLimit(companyCode, imageFiles.length);
            if (!limitCheckResult.success) {
              throw new Error(limitCheckResult.message);
            }

            // 2. If limit check is successful, proceed with analysis
            const allResults: any[] = [];
            for (let i = 0; i < imageFiles.length; i++) {
                const imageFile = imageFiles[i];
                setAnalysisMessage(t('analyzingMessage', { current: i + 1, total: imageFiles.length }));
                updateImageStatus(imageFile.id, 'processing');
                
                const formData = new FormData();
                formData.append('image', imageFile.file);
                formData.append('model', selectedModel);

                try {
                    const response = await fetch('/api/analyze', {
                      method: 'POST',
                      body: formData,
                    });

                    if (!response.ok) {
                      const errorData = await response.json();
                      console.error(`Error processing image ${imageFile.id}:`, errorData.error);
                      updateImageStatus(imageFile.id, 'error');
                      continue; // Skip this image and continue with the next one
                    }
                    const result = await response.json();
                    console.log(`📊 Image ${i + 1} API Response:`, result);
                    allResults.push(result);
                    updateImageStatus(imageFile.id, 'completed');
                } catch (err) {
                    console.error(`Network error processing image ${imageFile.id}:`, err);
                    updateImageStatus(imageFile.id, 'error');
                    continue; // Skip this image and continue with the next one
                }
            }

            // --- AGGREGATION AND NAVIGATION ---
            if (allResults.length === 0) {
              throw new Error(t('errorNoResults'));
            }

            // API'den dönen veri snake_case formatında, camelCase'e çeviriyoruz
            const finalMeta = allResults[0]?.invoice_meta || {};
            
            // Summary'yi son sayfadan al (genellikle orada olur)
            const finalSummary = allResults[allResults.length - 1]?.invoice_summary || null;
            const finalPaginatedData = allResults.map((result, index) => ({
                page: index + 1,
                items: (result.invoice_data || []).map((item: any) => ({
                    ...item,
                    originalNetto: item.Netto // Preserve original Netto for comparison
                })),
            }));

            const finalData = {
                invoiceMeta: finalMeta,
                invoiceData: finalPaginatedData,
                invoiceSummary: finalSummary,
            };

            console.log("🔍 Final Data for Review Page:");
            console.log("invoiceMeta:", finalMeta);
            console.log("invoiceSummary:", finalSummary);
            console.log("invoiceData length:", finalPaginatedData.length);

            sessionStorage.setItem('analysisResult', JSON.stringify(finalData));
            
            // Görselleri Base64'e çevir ve sessionStorage'a kaydet
            const imageBase64Strings: string[] = [];
            for (let i = 0; i < imageFiles.length; i++) {
                try {
                    const response = await fetch(imageFiles[i].preview);
                    const blob = await response.blob();
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = (error) => reject(error);
                        reader.readAsDataURL(blob);
                    });
                    imageBase64Strings.push(base64);
                } catch (error) {
                    console.error(`Görsel ${i + 1} Base64'e çevrilirken hata:`, error);
                }
            }
            
            sessionStorage.setItem('invoiceImages', JSON.stringify(imageBase64Strings));
            
            // Yeni tarama için editing mode'u temizle
            sessionStorage.removeItem('editingInvoiceId');
            
            // Increment scan count after successful analysis
            await incrementScanCount(companyCode, imageFiles.length);
            
            router.push('/review');

        } catch (err: any) {
            setError(err.message || t('errorGeneric')); // Hata mesajını dil dosyasından al
            console.error("Error during submit:", err);
            // Mark any remaining processing files as error
            imageFiles.forEach(file => {
                if (file.status === 'processing') {
                    updateImageStatus(file.id, 'error');
                }
            });
        } finally {
            setIsAnalyzing(false);
            setAnalysisMessage('');
        }
    };

    return (
        <div className="p-4 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t('title')}</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <ImageCapture onFilesChange={handleFilesChange} disabled={isAnalyzing} />
            </div>
            {imageFiles.length > 0 && (
                <div className="mt-4 bg-white p-6 rounded-lg shadow-md">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('modelSelectionLabel')}
                    </label>
                    <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isAnalyzing}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Model seçin" />
                        </SelectTrigger>
                        <SelectContent>
                            {MODELS.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                    {model.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            {error && <p className="text-red-600 mt-4 text-center font-semibold bg-red-100 p-3 rounded-md">{error}</p>}
            {imageFiles.length > 0 && (
                <ImagePreviewGrid 
                    images={imageFiles}
                    onRemove={handleRemoveImage}
                    onRetry={handleRetryImage}
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
        </div>
    );
}

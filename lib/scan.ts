// Paylaşılan tarama yardımcıları (istemci tarafı).
// Home ve Review (yeniden-tara) aynı analiz/yükleme/normalizasyon mantığını kullanır.
import imageCompression from 'browser-image-compression';

// Saf normalizasyon fonksiyonları ayrı modülde (Node'da test edilebilir).
export { parseNum, normalizeInvoiceItem, normalizePageItems } from './normalize';

export interface UploadedImageInfo {
    publicId: string;
    url: string;
    originalName: string;
}

const MAX_RETRIES = 3;

export const fetchWithRetry = async (url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> => {
    try {
        const response = await fetch(url, options);
        if (!response.ok && response.status >= 500 && retries > 0) {
            await new Promise(res => setTimeout(res, 1000));
            return fetchWithRetry(url, options, retries - 1);
        }
        return response;
    } catch (error) {
        // İptal edildiyse yeniden deneme
        if ((error as any)?.name === 'AbortError') throw error;
        if (retries > 0) {
            await new Promise(res => setTimeout(res, 1000));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
};

// Tek bir görseli analiz eder. Model, sunucu tarafında companyCode'dan çözülür.
export async function analyzeImage(file: File, companyCode: string, signal?: AbortSignal): Promise<any> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('companyCode', companyCode);

    const response = await fetchWithRetry('/api/analyze', { method: 'POST', body: formData, signal });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Analiz başarısız oldu.');
    }
    return response.json();
}

// Görseli sıkıştırıp Cloudinary'ye yükler.
export async function uploadImage(file: File): Promise<UploadedImageInfo> {
    const options = { maxSizeMB: 1.5, maxWidthOrHeight: 1920, useWebWorker: true };
    const compressedFile = await imageCompression(file, options);

    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

    const url = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!}/image/upload`;
    const response = await fetchWithRetry(url, { method: 'POST', body: formData });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Cloudinary yükleme hatası: ${errorData?.error?.message || response.status}`);
    }
    const data = await response.json();
    return { publicId: data.public_id, url: data.secure_url, originalName: file.name };
}

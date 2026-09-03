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

// Analize gönderilen görsel için sıkıştırma.
// Ölçüm: 2,57 MB / 4000px → 11,3 sn · 0,49 MB / 2000px → 5,1 sn, ikisinde de aynı 28 satır.
// Telefon fotoğrafları 3-8 MB olabildiği için asıl kazanç mobil yüklemede.
// 2000px, fatura satırlarının yapısal olarak okunması için fazlasıyla yeterli.
const ANALYSIS_IMAGE_OPTIONS = {
    maxSizeMB: 1,
    maxWidthOrHeight: 2000,
    useWebWorker: true,
    initialQuality: 0.85,
};

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

/**
 * Tek bir sayfayı analiz eder. Model, sunucu tarafında companyCode'dan çözülür.
 *
 * Kopyalanabilir PDF'lerde sayfanın metin katmanı gönderilir: hem daha az token
 * harcar hem de OCR hatası içermez. Taranmış PDF ve fotoğraflarda metin olmadığı
 * için görsel gönderilir — akışın geri kalanı ikisinde de aynıdır.
 */
export async function analyzeImage(
    file: File,
    companyCode: string,
    signal?: AbortSignal,
    text?: string
): Promise<any> {
    const formData = new FormData();
    formData.append('companyCode', companyCode);

    if (text && text.trim()) {
        formData.append('text', text);
    } else {
        // Ham telefon fotoğrafını göndermek yüklemeyi ve analizi gereksiz yavaşlatıyor.
        let payloadFile = file;
        try {
            payloadFile = await imageCompression(file, ANALYSIS_IMAGE_OPTIONS);
        } catch {
            // Sıkıştırma başarısız olursa orijinali gönder — analiz yine de çalışsın
        }
        formData.append('image', payloadFile);
    }

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

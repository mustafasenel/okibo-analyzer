// PDF → sayfa görselleri dönüşümü (tamamen tarayıcı tarafında).
// Amaç: Kullanıcı çok sayfalı bir PDF verdiğinde, PDF'i sayfa sayfa JPEG'e çevirip
// mevcut görsel akışına (analiz → kredi → yükleme → review) hiç dokunmadan besleyebilmek.

// Analiz kalitesi için hedeflenen sayfa genişliği (OCR doğruluğu ↔ boyut dengesi)
const TARGET_WIDTH = 1800;
const MAX_SCALE = 4;
const JPEG_QUALITY = 0.9;

// Tek seferde işlenebilecek azami sayfa (mobil bellek koruması)
export const MAX_PDF_PAGES = 30;

export function isPdf(file: File): boolean {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export class PdfError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PdfError';
    }
}

let pdfjsPromise: Promise<any> | null = null;

// pdf.js yalnızca gerektiğinde (tarayıcıda) yüklenir; worker public/ altından servis edilir.
async function loadPdfJs() {
    if (!pdfjsPromise) {
        pdfjsPromise = import('pdfjs-dist').then((lib) => {
            lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
            return lib;
        });
    }
    return pdfjsPromise;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new PdfError('Sayfa görsele dönüştürülemedi.'))),
            'image/jpeg',
            JPEG_QUALITY
        );
    });
}

/** Bir sayfanın analiz girdisi: görsel her zaman üretilir, metin varsa eklenir. */
export interface ExpandedPage {
    file: File;
    /** PDF'in metin katmanından okunan sayfa metni (yalnızca kullanılabilir ise) */
    text?: string;
}

/**
 * Metin katmanının analiz için kullanılabilir olup olmadığına karar verir.
 * Taranmış PDF'ler ya boş ya da birkaç anlamsız karakter döndürür; fatura metni ise
 * hem uzundur hem de bol rakam içerir. Emin olmadığımızda görsele düşeriz.
 */
function isUsableText(text: string): boolean {
    const compact = text.replace(/\s+/g, '');
    if (compact.length < 120) return false;
    const digits = (compact.match(/\d/g) ?? []).length;
    return digits >= 15 && digits / compact.length >= 0.05;
}

/**
 * Bir PDF sayfasının metnini satır düzenini koruyarak çıkarır.
 * Parçalar y koordinatına göre satırlara, satır içinde x'e göre soldan sağa dizilir —
 * böylece sütun sırası (koli, içerik, miktar, fiyat, tutar) bozulmadan kalır.
 */
async function extractPageText(page: any): Promise<string> {
    const content = await page.getTextContent();
    const rows = new Map<number, { x: number; s: string }[]>();

    for (const item of content.items as any[]) {
        const str = item?.str;
        if (!str || !str.trim()) continue;
        const y = Math.round(item.transform[5]);
        // Aynı satırdaki parçalar birkaç piksel kayabilir
        let key = y;
        for (const existing of rows.keys()) {
            if (Math.abs(existing - y) <= 2) { key = existing; break; }
        }
        if (!rows.has(key)) rows.set(key, []);
        rows.get(key)!.push({ x: item.transform[4], s: str });
    }

    return [...rows.entries()]
        .sort((a, b) => b[0] - a[0])                       // yukarıdan aşağı
        .map(([, parts]) =>
            parts.sort((a, b) => a.x - b.x).map(p => p.s).join(' ').replace(/\s+/g, ' ').trim()
        )
        .filter(Boolean)
        .join('\n');
}

/**
 * Bir PDF dosyasını sayfa sayfa JPEG File nesnelerine çevirir.
 * @param onProgress (islenen, toplam) — ilerleme bildirimi
 */
export async function pdfToPageImages(
    file: File,
    onProgress?: (current: number, total: number) => void
): Promise<ExpandedPage[]> {
    const pdfjs = await loadPdfJs();
    const data = await file.arrayBuffer();

    let pdf: any;
    try {
        pdf = await pdfjs.getDocument({ data }).promise;
    } catch (err: any) {
        if (err?.name === 'PasswordException') {
            throw new PdfError('Bu PDF parola korumalı. Lütfen parolasız bir kopya yükleyin.');
        }
        throw new PdfError('PDF dosyası okunamadı. Dosya bozuk olabilir.');
    }

    const total: number = pdf.numPages;
    if (total === 0) {
        throw new PdfError('PDF içinde sayfa bulunamadı.');
    }
    if (total > MAX_PDF_PAGES) {
        throw new PdfError(
            `PDF ${total} sayfa içeriyor. Tek seferde en fazla ${MAX_PDF_PAGES} sayfa işlenebilir.`
        );
    }

    const baseName = file.name.replace(/\.pdf$/i, '') || 'fatura';
    const pages: ExpandedPage[] = [];

    try {
        for (let pageNo = 1; pageNo <= total; pageNo++) {
            const page = await pdf.getPage(pageNo);

            // Metin katmanını görselle aynı geçişte oku (PDF ikinci kez açılmasın)
            let pageText = '';
            try {
                pageText = await extractPageText(page);
            } catch {
                // Metin çıkarılamazsa sorun değil — görselden okunur
            }

            // Ölçeği hedef genişliğe göre ayarla
            const baseViewport = page.getViewport({ scale: 1 });
            const scale = Math.min(MAX_SCALE, Math.max(1, TARGET_WIDTH / baseViewport.width));
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            const context = canvas.getContext('2d');
            if (!context) throw new PdfError('Tarayıcı görsel işlemeyi desteklemiyor.');

            // PDF'lerde saydam zemin siyah çıkabilir → beyaz zemin bas
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({ canvas, canvasContext: context, viewport }).promise;

            const blob = await canvasToJpegBlob(canvas);
            pages.push({
                file: new File([blob], `${baseName}-sayfa-${pageNo}.jpg`, { type: 'image/jpeg' }),
                ...(isUsableText(pageText) ? { text: pageText } : {}),
            });

            // Belleği serbest bırak
            canvas.width = 0;
            canvas.height = 0;
            page.cleanup?.();

            onProgress?.(pageNo, total);
        }
    } finally {
        pdf.destroy?.();
    }

    return pages;
}

/**
 * Seçilen dosyaları normalize eder: PDF'ler sayfa görsellerine açılır,
 * görseller olduğu gibi geçer. Desteklenmeyen türler elenir.
 */
export async function expandFilesToImages(
    files: File[],
    onProgress?: (info: { fileName: string; current: number; total: number }) => void
): Promise<{ images: ExpandedPage[]; errors: string[] }> {
    const images: ExpandedPage[] = [];
    const errors: string[] = [];

    for (const file of files) {
        if (isPdf(file)) {
            try {
                const pages = await pdfToPageImages(file, (current, total) =>
                    onProgress?.({ fileName: file.name, current, total })
                );
                images.push(...pages);
            } catch (err) {
                errors.push(err instanceof PdfError ? err.message : `${file.name} işlenemedi.`);
            }
        } else if (file.type.startsWith('image/')) {
            // Fotoğrafın metin katmanı yoktur — görselden okunur
            images.push({ file });
        } else {
            errors.push(`${file.name}: desteklenmeyen dosya türü.`);
        }
    }

    return { images, errors };
}

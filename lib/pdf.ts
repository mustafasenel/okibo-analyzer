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

/**
 * Bir PDF dosyasını sayfa sayfa JPEG File nesnelerine çevirir.
 * @param onProgress (islenen, toplam) — ilerleme bildirimi
 */
export async function pdfToPageImages(
    file: File,
    onProgress?: (current: number, total: number) => void
): Promise<File[]> {
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
    const pages: File[] = [];

    try {
        for (let pageNo = 1; pageNo <= total; pageNo++) {
            const page = await pdf.getPage(pageNo);

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
            pages.push(
                new File([blob], `${baseName}-sayfa-${pageNo}.jpg`, { type: 'image/jpeg' })
            );

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
): Promise<{ images: File[]; errors: string[] }> {
    const images: File[] = [];
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
            images.push(file);
        } else {
            errors.push(`${file.name}: desteklenmeyen dosya türü.`);
        }
    }

    return { images, errors };
}

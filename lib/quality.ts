// Sayfa görsellerinin okunabilirlik (netlik) tahmini.
// Laplacian varyansı: keskin görüntülerde kenar tepkisi yüksek, bulanıkta düşük olur.
// Amaç kesin ölçüm değil, kullanıcıyı "bu sayfa bulanık, yeniden çek" diye uyarmak.

export type SharpnessLabel = 'sharp' | 'blurry' | 'unknown';

export interface SharpnessResult {
    score: number;          // laplacian varyansı
    label: SharpnessLabel;
}

// Bu eşiğin altı "bulanık" sayılır (480px genişliğe ölçeklenmiş görüntü için).
const BLUR_THRESHOLD = 90;
const SAMPLE_WIDTH = 480;

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
    if (typeof createImageBitmap === 'function') {
        return createImageBitmap(file);
    }
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Görsel okunamadı')); };
        img.src = url;
    });
}

export async function assessSharpness(file: File): Promise<SharpnessResult> {
    try {
        const bmp = await loadBitmap(file);
        const srcW = (bmp as ImageBitmap).width;
        const srcH = (bmp as ImageBitmap).height;
        if (!srcW || !srcH) return { score: 0, label: 'unknown' };

        const scale = Math.min(1, SAMPLE_WIDTH / srcW);
        const w = Math.max(8, Math.floor(srcW * scale));
        const h = Math.max(8, Math.floor(srcH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return { score: 0, label: 'unknown' };

        ctx.drawImage(bmp as CanvasImageSource, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        // Gri tonlama
        const gray = new Float32Array(w * h);
        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
            gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }

        // 3x3 Laplacian ve varyans
        let sum = 0;
        let sumSq = 0;
        let count = 0;
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const i = y * w + x;
                const lap =
                    -4 * gray[i] +
                    gray[i - 1] + gray[i + 1] +
                    gray[i - w] + gray[i + w];
                sum += lap;
                sumSq += lap * lap;
                count++;
            }
        }

        if (typeof (bmp as ImageBitmap).close === 'function') (bmp as ImageBitmap).close();
        canvas.width = 0;
        canvas.height = 0;

        if (count === 0) return { score: 0, label: 'unknown' };
        const mean = sum / count;
        const variance = sumSq / count - mean * mean;
        const score = Math.round(variance);

        return { score, label: score < BLUR_THRESHOLD ? 'blurry' : 'sharp' };
    } catch {
        return { score: 0, label: 'unknown' };
    }
}

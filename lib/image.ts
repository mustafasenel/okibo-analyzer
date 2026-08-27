// Sayfa görselleri üzerinde istemci tarafı düzenlemeler.

/** Görseli verilen açıyla döndürüp yeni bir File döndürür (90'ın katları). */
export async function rotateImageFile(file: File, degrees: number): Promise<File> {
    const deg = ((degrees % 360) + 360) % 360;
    if (deg === 0) return file;

    const bitmap = await createImageBitmap(file);
    const swap = deg === 90 || deg === 270;
    const canvas = document.createElement('canvas');
    canvas.width = swap ? bitmap.height : bitmap.width;
    canvas.height = swap ? bitmap.width : bitmap.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92)
    );
    canvas.width = 0;
    canvas.height = 0;
    if (!blob) return file;

    return new File([blob], file.name, { type: 'image/jpeg' });
}

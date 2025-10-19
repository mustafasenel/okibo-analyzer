import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Görsel yükleme endpoint'i
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const invoiceId = formData.get('invoiceId') as string;
    const files = formData.getAll('files') as File[];
    const pageNumbers = formData.getAll('pageNumbers') as string[];

    if (!invoiceId || files.length === 0) {
      return NextResponse.json({ error: 'Invoice ID and files are required' }, { status: 400 });
    }

    // Invoice'un var olduğunu kontrol et
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const savedImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const pageNumber = parseInt(pageNumbers[i] || '1');

      // Dosyayı Buffer'a çevir
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Görseli veritabanına kaydet
      const savedImage = await prisma.invoiceImage.create({
        data: {
          invoiceId: invoiceId,
          filename: `${invoiceId}_page_${pageNumber}_${Date.now()}.jpg`,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          data: buffer,
          pageNumber: pageNumber,
        }
      });

      savedImages.push({
        id: savedImage.id,
        filename: savedImage.filename,
        originalName: savedImage.originalName,
        pageNumber: savedImage.pageNumber,
        size: savedImage.size,
      });
    }

    return NextResponse.json({ 
      success: true, 
      images: savedImages 
    });

  } catch (error) {
    console.error('Error uploading images:', error);
    return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 });
  }
}

// Görsel indirme endpoint'i
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('id');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    const image = await prisma.invoiceImage.findUnique({
      where: { id: imageId }
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Buffer'ı Response olarak döndür
    return new NextResponse(image.data, {
      headers: {
        'Content-Type': image.mimeType,
        'Content-Disposition': `inline; filename="${image.originalName}"`,
        'Cache-Control': 'public, max-age=31536000', // 1 yıl cache
      },
    });

  } catch (error) {
    console.error('Error retrieving image:', error);
    return NextResponse.json({ error: 'Failed to retrieve image' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fatura görsellerini getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const images = await prisma.invoiceImage.findMany({
      where: { invoiceId: invoiceId },
      orderBy: { pageNumber: 'asc' },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        pageNumber: true,
        createdAt: true,
        data: true, // Buffer'ı da döndür
      }
    });

    // Buffer'ları Base64 string'e çevir
    const imagesWithBase64 = images.map(img => ({
      ...img,
      data: Buffer.from(img.data).toString('base64')
    }));

    return NextResponse.json({ success: true, images: imagesWithBase64 });

  } catch (error) {
    console.error('Error retrieving invoice images:', error);
    return NextResponse.json({ error: 'Failed to retrieve images' }, { status: 500 });
  }
}

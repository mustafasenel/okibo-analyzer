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
        publicId: true,
        url: true,
        originalName: true,
        pageNumber: true,
      }
    });

    return NextResponse.json({ success: true, images: images });

  } catch (error) {
    console.error('Error retrieving invoice images:', error);
    return NextResponse.json({ error: 'Failed to retrieve images' }, { status: 500 });
  }
}

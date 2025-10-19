import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Tek bir faturayı getir
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: invoiceId } = await params;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        company: {
          select: {
            name: true,
            code: true
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice });

  } catch (error) {
    console.error('Error retrieving invoice:', error);
    return NextResponse.json({ error: 'Failed to retrieve invoice' }, { status: 500 });
  }
}

// Faturayı sil
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: invoiceId } = await params;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    // Faturayı ve ilişkili görselleri sil
    await prisma.invoice.delete({
      where: { id: invoiceId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}
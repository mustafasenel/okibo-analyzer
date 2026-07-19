import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyCode = searchParams.get('companyCode');

    if (!companyCode) {
      return NextResponse.json({ error: 'Company code is required' }, { status: 400 });
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        company: {
          code: companyCode
        }
      },
      include: {
        company: {
          select: {
            name: true,
            code: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Tekil fatura silme /api/invoices/[id] altındadır (bkz. app/api/invoices/[id]/route.ts).

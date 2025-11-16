import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Firma istatistiklerini getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyCode = searchParams.get('code');

    if (!companyCode) {
      return NextResponse.json({ error: 'Company code is required' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { code: companyCode },
      select: {
        id: true,
        name: true,
        code: true,
        monthlyScanLimit: true,
        currentScanCount: true,
        scanCountResetAt: true,
      }
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Kullanım yüzdesini hesapla
    const usagePercentage = company.monthlyScanLimit > 0 
      ? Math.round((company.currentScanCount / company.monthlyScanLimit) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      company: {
        name: company.name,
        code: company.code,
        monthlyLimit: company.monthlyScanLimit,
        currentMonthUsage: company.currentScanCount,
        usagePercentage,
        remainingScans: Math.max(0, company.monthlyScanLimit - company.currentScanCount),
        lastResetDate: company.scanCountResetAt,
      }
    });

  } catch (error) {
    console.error('Error fetching company stats:', error);
    return NextResponse.json({ error: 'Failed to fetch company statistics' }, { status: 500 });
  }
}

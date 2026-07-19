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
        isActive: true,
        monthlyCredits: true,
        usedCredits: true,
        creditResetAt: true,
        model: {
          select: { displayName: true, creditMultiplier: true },
        },
      }
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const multiplier = company.model?.creditMultiplier && company.model.creditMultiplier > 0
      ? company.model.creditMultiplier
      : 1;
    const remainingCredits = Math.max(0, company.monthlyCredits - company.usedCredits);

    // Kredi kullanım yüzdesi
    const usagePercentage = company.monthlyCredits > 0
      ? Math.round((company.usedCredits / company.monthlyCredits) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      company: {
        name: company.name,
        code: company.code,
        isActive: company.isActive,
        // Kredi tabanlı alanlar (yeni)
        monthlyCredits: company.monthlyCredits,
        usedCredits: company.usedCredits,
        remainingCredits,
        modelName: company.model?.displayName ?? null,
        creditMultiplier: multiplier,
        // Geriye dönük uyumlu anahtarlar (SettingsForm bunları kullanıyor)
        monthlyLimit: company.monthlyCredits,
        currentMonthUsage: company.usedCredits,
        usagePercentage,
        remainingScans: Math.floor(remainingCredits / multiplier),
        lastResetDate: company.creditResetAt,
      }
    });

  } catch (error) {
    console.error('Error fetching company stats:', error);
    return NextResponse.json({ error: 'Failed to fetch company statistics' }, { status: 500 });
  }
}

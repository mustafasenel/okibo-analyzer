import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Ayarlar > Kullanım detayı için hafif özet:
 * son 7 günün günlük kredi kullanımı ve son hareketler.
 * (Fatura satırlarını taşımaz — sadece sayılar.)
 */
export async function GET(request: NextRequest) {
    try {
        const code = new URL(request.url).searchParams.get('code');
        if (!code) {
            return NextResponse.json({ error: 'Company code is required' }, { status: 400 });
        }

        const company = await prisma.company.findUnique({
            where: { code },
            select: { monthlyCredits: true, usedCredits: true, creditResetAt: true },
        });
        if (!company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        // Yerel güne göre anahtar (toISOString UTC'ye çevirip günü kaydırıyor)
        const dayKey = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const since = new Date();
        since.setDate(since.getDate() - 6);
        since.setHours(0, 0, 0, 0);

        const invoices = await prisma.invoice.findMany({
            where: { companyCode: code },
            orderBy: { createdAt: 'desc' },
            take: 60,
            select: { id: true, createdAt: true, creditsCost: true, invoiceMeta: true, invoiceData: true },
        });

        // Son 7 günün günlük toplamı
        const days: { date: string; credits: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            days.push({ date: dayKey(d), credits: 0 });
        }
        const dayIndex = new Map(days.map((d, i) => [d.date, i]));
        for (const inv of invoices) {
            if (inv.createdAt < since) continue;
            const key = dayKey(new Date(inv.createdAt));
            const idx = dayIndex.get(key);
            if (idx !== undefined) days[idx].credits += inv.creditsCost ?? 0;
        }

        // Son hareketler
        const recent = invoices.slice(0, 12).map(inv => {
            const meta = (inv.invoiceMeta ?? {}) as Record<string, unknown>;
            const pages = Array.isArray(inv.invoiceData) ? inv.invoiceData.length : 0;
            return {
                id: inv.id,
                name: String(meta.Firma ?? meta.Rechnungsnummer ?? ''),
                createdAt: inv.createdAt,
                pages,
                credits: inv.creditsCost ?? 0,
            };
        });

        return NextResponse.json({
            success: true,
            usage: {
                monthlyCredits: company.monthlyCredits,
                usedCredits: company.usedCredits,
                remainingCredits: Math.max(0, company.monthlyCredits - company.usedCredits),
                resetAt: company.creditResetAt,
                days,
                recent,
            },
        });
    } catch (error) {
        console.error('Error building usage summary:', error);
        return NextResponse.json({ error: 'Failed to build usage summary' }, { status: 500 });
    }
}

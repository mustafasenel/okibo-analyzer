'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Camera, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { InvoiceItem, InvoiceSummary } from "@/types/invoice";

interface ReviewDataTabsProps {
    invoiceMeta: any;
    invoiceSummary: InvoiceSummary | null;
    invoiceData: InvoiceItem[];
    currentPage: number;
    totalPages: number;
    onNextPage: () => void;
    onPreviousPage: () => void;
    // Sayfayı yeniden tarama (yalnızca yeni tarama modunda verilir; salt-görüntülemede verilmez)
    onRescanPage?: () => void;
    isRescanning?: boolean;
}

const fmt = (value: unknown, digits = 2) => {
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? '0').replace(',', '.'));
    if (isNaN(n)) return '-';
    return new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
};

export default function ReviewDataTabs({
    invoiceMeta,
    invoiceSummary,
    invoiceData,
    currentPage,
    totalPages,
    onNextPage,
    onPreviousPage,
    onRescanPage,
    isRescanning,
}: ReviewDataTabsProps) {
    const t = useTranslations('ReviewDataTabs');
    const t_cols = useTranslations('ReviewDataTabs.columns');

    const hasMetaData = invoiceMeta && Object.keys(invoiceMeta).length > 0;
    const hasSummaryData = invoiceSummary && Object.keys(invoiceSummary).length > 0;
    const hasInvoiceData = Array.isArray(invoiceData) && invoiceData.length > 0;

    // Fatura satırlarındaki değerlerin OCR vs hesaplanan tutarlılığı
    const hasVatData = hasInvoiceData && invoiceData.some(item => item.MwSt !== undefined && item.MwSt !== null);

    const calculatedTotal = hasInvoiceData
        ? invoiceData.reduce((acc, item) => {
            const netto = typeof item.originalNetto === 'number'
                ? item.originalNetto
                : parseFloat(String(item.originalNetto ?? item.Netto ?? '0').replace(',', '.'));
            return acc + (isNaN(netto) ? 0 : netto);
        }, 0)
        : 0;

    const summaryNet = invoiceSummary?.total_net ?? invoiceSummary?.Zwischensumme;
    const totalsMatch = summaryNet !== undefined && Math.abs(Number(summaryNet) - calculatedTotal) < 0.02;

    return (
        <div className="space-y-6 text-sm px-2 sm:px-0">
            {/* Fatura Bilgileri (başlık) */}
            {hasMetaData && (
                <div>
                    <h3 className="text-base font-semibold text-gray-800 mb-2 px-2">{t('invoiceInfo')}</h3>
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                        {Object.entries(invoiceMeta).map(([key, value]) => (
                            <div key={key} className="flex justify-between py-1.5 border-b last:border-b-0">
                                <span className="font-medium text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                                <span className="text-gray-900 font-medium text-right">{String(value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Ürün Satırları (salt-okunur fatura tablosu) */}
            {hasInvoiceData && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 sm:p-4">
                        <CardTitle className="truncate text-sm sm:text-base">{t('invoiceItemsTitle')}</CardTitle>
                        <div className="flex flex-shrink-0 items-center gap-2">
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1 text-sm font-medium">
                                    <Button variant="outline" size="icon" onClick={onPreviousPage} disabled={currentPage === 1} className="h-8 w-8">
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="whitespace-nowrap text-xs">
                                        {t('pagination.page', { current: currentPage, total: totalPages })}
                                    </span>
                                    <Button variant="outline" size="icon" onClick={onNextPage} disabled={currentPage === totalPages} className="h-8 w-8">
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-4 sm:pt-0">
                        {onRescanPage && (
                            <div className="flex flex-col gap-2.5 border-y bg-violet-50/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:rounded-lg sm:border sm:mb-3">
                                <div className="flex items-start gap-2">
                                    <Camera className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                                    <p className="text-xs leading-snug text-gray-600">
                                        Bu sayfa yanlış mı okundu? <span className="font-medium text-gray-800">Fotoğrafı yeniden çekip</span> tekrar analiz edebilirsiniz. Yalnızca bu sayfa güncellenir.
                                    </p>
                                </div>
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={onRescanPage}
                                    disabled={isRescanning}
                                    className="h-9 shrink-0 gap-1.5 bg-violet-600 hover:bg-violet-700"
                                >
                                    {isRescanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                                    {isRescanning ? 'Analiz ediliyor…' : 'Sayfayı Yeniden Çek'}
                                </Button>
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white text-xs sm:text-sm">
                                <thead className="bg-gray-50 text-gray-600">
                                    <tr>
                                        <th className="p-2 text-left font-semibold">#</th>
                                        <th className="p-2 text-left font-semibold">{t_cols('artikelBez')}</th>
                                        <th className="p-2 text-left font-semibold">{t_cols('artikelNumber')}</th>
                                        <th className="p-2 text-right font-semibold">{t_cols('kolli')}</th>
                                        <th className="p-2 text-right font-semibold">{t_cols('inhalt')}</th>
                                        <th className="p-2 text-right font-semibold">{t_cols('menge')}</th>
                                        <th className="p-2 text-right font-semibold">{t_cols('preis')}</th>
                                        {hasVatData && <th className="p-2 text-right font-semibold">KDV %</th>}
                                        <th className="p-2 text-right font-semibold">{t_cols('nettoCalculated')}</th>
                                        <th className="p-2 text-right font-semibold">{t_cols('nettoOcr')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {invoiceData.map((item, index) => {
                                        const calc = typeof item.originalNetto === 'number'
                                            ? item.originalNetto
                                            : parseFloat(String(item.originalNetto ?? '0').replace(',', '.'));
                                        const ocr = typeof item.Netto === 'number'
                                            ? item.Netto
                                            : parseFloat(String(item.Netto ?? '0').replace(',', '.'));
                                        const match = Math.abs(calc - ocr) < 0.02;
                                        const nettoColor = match ? 'text-gray-900' : 'text-red-600';
                                        return (
                                            <tr key={index} className="text-gray-900">
                                                <td className="p-2 text-gray-400">{index + 1}</td>
                                                <td className="p-2 font-medium max-w-[10rem] truncate" title={String(item.ArtikelBez || '')}>
                                                    {item.ArtikelBez || <span className="text-gray-400 italic">{t('noNameProduct')}</span>}
                                                </td>
                                                <td className="p-2 font-mono text-gray-600">{item.ArtikelNumber || '-'}</td>
                                                <td className="p-2 text-right">{item.Kolli}</td>
                                                <td className="p-2 text-right">{item.Inhalt}</td>
                                                <td className="p-2 text-right">{item.Menge}</td>
                                                <td className="p-2 text-right">{fmt(item.Preis, 3)}</td>
                                                {hasVatData && <td className="p-2 text-right">{item.MwSt ?? '-'}</td>}
                                                <td className={`p-2 text-right font-semibold ${nettoColor}`}>{fmt(calc)}</td>
                                                <td className={`p-2 text-right ${nettoColor}`}>{fmt(ocr)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Fatura Özeti (dip toplam) */}
            <div>
                <h3 className="text-base font-semibold text-gray-800 mb-2 px-2">{t('summary')}</h3>
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                    {hasSummaryData ? (
                        <>
                            {invoiceSummary!.vat_7 !== undefined && (
                                <SummaryRow label="KDV %7" value={`${fmt(invoiceSummary!.vat_7)} €`} />
                            )}
                            {invoiceSummary!.vat_19 !== undefined && (
                                <SummaryRow label="KDV %19" value={`${fmt(invoiceSummary!.vat_19)} €`} />
                            )}
                            {invoiceSummary!.total_vat !== undefined && (
                                <SummaryRow label="Toplam KDV" value={`${fmt(invoiceSummary!.total_vat)} €`} />
                            )}
                            {invoiceSummary!.total_net !== undefined && (
                                <SummaryRow label="Toplam Net Tutar" value={`${fmt(invoiceSummary!.total_net)} €`} />
                            )}
                            {invoiceSummary!.total_gross !== undefined && (
                                <SummaryRow label="Toplam Brüt Tutar" value={`${fmt(invoiceSummary!.total_gross)} €`} strong last />
                            )}
                        </>
                    ) : (
                        <div className="text-center py-3 text-gray-500">
                            <p>Bu sayfada finansal özet bilgisi bulunmuyor.</p>
                            <p className="text-xs mt-1">Özet bilgileri genellikle fatura sonunda yer alır.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Hesaplanan Toplam (satırlardan) — özet ile karşılaştırma */}
            {hasInvoiceData && (
                <div>
                    <h3 className="text-base font-semibold text-gray-800 mb-2 px-2">{t('calculatedSummary')}</h3>
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <div className="flex justify-between py-1">
                            <span className="font-medium text-gray-600">{t('calculatedTotal')} (satırlar)</span>
                            <span className={`font-bold ${totalsMatch ? 'text-green-600' : 'text-gray-900'}`}>{fmt(calculatedTotal)} €</span>
                        </div>
                        {summaryNet !== undefined && !totalsMatch && (
                            <p className="text-xs text-amber-600 mt-1">
                                Not: Hesaplanan toplam, fatura özetindeki net tutarla ({fmt(summaryNet)} €) birebir eşleşmiyor.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const SummaryRow = ({ label, value, strong, last }: { label: string; value: string; strong?: boolean; last?: boolean }) => (
    <div className={`flex justify-between py-1.5 ${last ? '' : 'border-b'}`}>
        <span className={`text-gray-600 ${strong ? 'font-semibold' : 'font-medium'}`}>{label}</span>
        <span className={`text-gray-900 ${strong ? 'font-bold text-base' : 'font-semibold'}`}>{value}</span>
    </div>
);

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, List, PlusCircle, Table, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { InvoiceItem, InvoiceSummary } from "@/types/invoice";

interface ReviewDataTabsProps {
    invoiceMeta: any;
    invoiceSummary: InvoiceSummary | null;
    invoiceData: InvoiceItem[];
    onItemChange: (index: number, updatedItem: InvoiceItem) => void;
    onAddItem: (index: number) => void;
    onDeleteItem: (index: number) => void;
    currentPage: number;
    totalPages: number;
    onNextPage: () => void;
    onPreviousPage: () => void;
}

// Component tanımında prop'ların tipini belirtiyoruz
export default function ReviewDataTabs({ invoiceMeta, invoiceSummary, invoiceData, onItemChange, onAddItem, onDeleteItem, currentPage, totalPages, onNextPage, onPreviousPage }: ReviewDataTabsProps) {
  const t = useTranslations('ReviewDataTabs');
  const t_abbr = useTranslations('ReviewDataTabs.abbreviations');
  const t_cols = useTranslations('ReviewDataTabs.columns');
  const [activeTab, setActiveTab] = useState<'table' | 'json'>('table');
  const [layoutMode, setLayoutMode] = useState<'list' | 'table'>('table');
  const [ocrSubtotal, setOcrSubtotal] = useState<number | null>(null);

  if (!invoiceMeta || !invoiceData || invoiceData.length === 0) {
    return null;
  }

  const hasMetaData = invoiceMeta && Object.keys(invoiceMeta).length > 0;
  const hasSummaryData = invoiceSummary && invoiceSummary !== null && Object.keys(invoiceSummary).length > 0;
  const hasInvoiceData = Array.isArray(invoiceData) && invoiceData.length > 0;
  
  
  // Check if any item has MwSt data
  const hasVatData = hasInvoiceData && invoiceData.some(item => item.MwSt !== undefined && item.MwSt !== null);

  const calculatedTotal = hasInvoiceData
    ? invoiceData
        .reduce((acc, item) => {
          const nettoValue = parseFloat(String(item.Netto || '0').replace(',', '.'));
          return acc + (isNaN(nettoValue) ? 0 : nettoValue);
        }, 0)
        .toFixed(3)
    : '0.000';

  useEffect(() => {
    setOcrSubtotal(invoiceSummary?.Zwischensumme ? parseFloat(String(invoiceSummary.Zwischensumme).replace(',', '.')) : null);
  }, [invoiceSummary]);

  const totalsMatch = ocrSubtotal !== null && parseFloat(calculatedTotal) === ocrSubtotal;

  const colorClass = totalsMatch ? 'text-green-600' : 'text-red-600';

  const handleFieldChange = (index: number, field: string, value: any) => {
    const updatedItem = { ...invoiceData[index], [field]: value };
    onItemChange(index, updatedItem);
  };

  if (!hasSummaryData && !hasInvoiceData) {
    return (
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-700">{t('noDataTitle')}</h3>
            <p className="text-gray-500 mt-2">{t('noDataMessage')}</p>
        </div>
    );
  }

  return (
      <div className="space-y-4">
          {/* Tab Butonları */}
          <div className="mb-4 border-b border-gray-200">
              <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                  <button 
                      onClick={() => setActiveTab('table')} 
                      className={`${activeTab === 'table' ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-base`}
                  >
                      {t('table')}
                  </button>
                  <button 
                      onClick={() => setActiveTab('json')} 
                      className={`${activeTab === 'json' ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-base`}
                  >
                      {t('json')}
                  </button>
              </nav>
          </div>
          {/* Tab İçerikleri */}
          <div>
              {activeTab === 'table' && (
                  <div className="space-y-6 text-sm">
                      {/* Fatura Bilgileri */}
                      {hasMetaData && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2 px-4">{t('invoiceInfo')}</h3>
                            <div className="bg-white p-4 rounded-lg border shadow-sm">
                                {Object.entries(invoiceMeta).map(([key, value]) => (
                                    <div key={key} className="flex justify-between py-1.5 border-b last:border-b-0">
                                        <span className="font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                                        <span className="text-gray-800">{String(value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                      )}
          
                      {/* Minimalist Ürün Satırları Tasarımı */}
                      {hasInvoiceData && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-x-2">
                                <CardTitle className="truncate">{t('invoiceItemsTitle')}</CardTitle>
                                <div className="flex flex-shrink-0 items-center gap-2">
                                    {/* Pagination Controls */}
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={onPreviousPage}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="whitespace-nowrap">
                                            {t('pagination.page', { current: currentPage, total: totalPages })}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={onNextPage}
                                            disabled={currentPage === totalPages}
                                            className="h-8 w-8"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {/* Layout Toggle */}
                                    <div className="flex items-center">
                                        <Button
                                            variant={layoutMode === 'list' ? 'default' : 'outline'}
                                            size="icon"
                                            onClick={() => setLayoutMode('list')}
                                            className="h-8 w-8"
                                        >
                                            <List className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant={layoutMode === 'table' ? 'default' : 'outline'}
                                            size="icon"
                                            onClick={() => setLayoutMode('table')}
                                            className="h-8 w-8"
                                        >
                                            <Table className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {layoutMode === 'list' ? (
                                    <div className="bg-white rounded-lg border shadow-sm divide-y">
                                        {/* MINIMALIST LIST VIEW (existing code) */}
                                        {invoiceData.map((item, index) => (
                                          <div key={index} className="p-3 relative group">
                                            {/* Üst Satır: Ana Bilgiler */}
                                            <div className="flex items-center gap-3">
                                              <span className="font-mono text-sm text-gray-400">{index + 1}.</span>
                                              <input 
                                                type="text"
                                                value={String(item['ArtikelBez'] || '')}
                                                onChange={(e) => handleFieldChange(index, 'ArtikelBez', e.target.value)}
                                                className="flex-grow font-semibold text-gray-800 bg-transparent p-0 focus:outline-none focus:bg-violet-50 rounded px-1"
                                                placeholder={t('noNameProduct')}
                                                onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                                              />
                                              <CustomCurrencyInput
                                                value={parseFloat(String(item['Netto'] || '0'))}
                                                onValueChange={(value) => handleFieldChange(index, 'Netto', value || 0)}
                                                className="w-24 min-w-0 font-bold text-lg text-violet-600 bg-transparent p-0 focus:outline-none focus:bg-violet-50 rounded text-right pr-1"
                                              />
                                            </div>
                                            {/* Alt Satır: Detaylar */}
                                            <div className="flex items-end flex-wrap gap-x-4 gap-y-1 mt-1 pl-7 text-xs text-gray-600">
                                              <DetailInput label={t_abbr('artikel')} value={String(item['ArtikelNumber'] || '')} onChange={e => handleFieldChange(index, 'ArtikelNumber', e.target.value)} className="w-24 font-mono" />
                                              <DetailInput label={t_abbr('kolli')} type="text" inputMode="numeric" value={String(item['Kolli'] || '')} onChange={e => handleFieldChange(index, 'Kolli', e.target.value)} className="w-10" />
                                              <DetailInput label={t_abbr('inhalt')} type="text" inputMode="numeric" value={String(item['Inhalt'] || '')} onChange={e => handleFieldChange(index, 'Inhalt', e.target.value)} className="w-10" />
                                              <DetailInput label={t_abbr('menge')} type="text" inputMode="numeric" value={String(item['Menge'] || '')} onChange={e => handleFieldChange(index, 'Menge', e.target.value)} className="w-10" />
                                              <CustomCurrencyInput
                                                asDetail
                                                label={t_abbr('preis')}
                                                value={parseFloat(String(item['Preis'] || '0'))}
                                                onValueChange={(value) => handleFieldChange(index, 'Preis', value || 0)}
                                                className="w-16"
                                              />
                                              {hasVatData && (
                                                  <DetailInput label="KDV%" type="text" inputMode="numeric" value={String(item['MwSt'] || '')} onChange={e => handleFieldChange(index, 'MwSt', e.target.value)} className="w-8" />
                                              )}
                                            </div>
                                            {/* Aksiyon Butonları (Gizli, hover'da görünür) */}
                                            <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button onClick={() => onAddItem(index)} className="p-1.5 text-green-500 bg-green-100 rounded-full hover:bg-green-200">
                                                <PlusCircle size={18} />
                                              </button>
                                              <button onClick={() => onDeleteItem(index)} className="p-1.5 text-red-500 bg-red-100 rounded-full hover:bg-red-200">
                                                <Trash2 size={18} />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full bg-white rounded-lg border shadow-sm text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="p-3 text-left font-semibold text-gray-700">#</th>
                                                    <th className="p-3 text-left font-semibold text-gray-700">{t_cols('artikelBez')}</th>
                                                    <th className="p-3 text-left font-semibold text-gray-700">{t_cols('artikelNumber')}</th>
                                                    <th className="p-3 text-left font-semibold text-gray-700">{t_cols('kolli')}</th>
                                                    <th className="p-3 text-left font-semibold text-gray-700">{t_cols('inhalt')}</th>
                                                    <th className="p-3 text-left font-semibold text-gray-700">{t_cols('menge')}</th>
                                                    <th className="p-3 text-left font-semibold text-gray-700">{t_cols('preis')}</th>
                                                    {hasVatData && <th className="p-3 text-left font-semibold text-gray-700">KDV %</th>}
                                                    <th className="p-3 text-left font-semibold text-gray-700">{t_cols('nettoCalculated')}</th>
                                                    <th className="p-3 text-left font-semibold text-gray-700">{t_cols('nettoOcr')}</th>
                                                    <th className="p-3 text-left font-semibold text-gray-700">{t_cols('actions')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {invoiceData.map((item, index) => {
                                                    const kolli = parseInt(String(item['Kolli'] || '0'), 10) || 0;
                                                    const inhalt = parseInt(String(item['Inhalt'] || '0'), 10) || 0;
                                                    const menge = kolli * inhalt;
                                                    const preis = parseFloat(String(item['Preis'] || '0').replace(',', '.')) || 0;
                                                    const calculatedNetto = menge * preis;
                                                    const calculatedNettoString = calculatedNetto.toFixed(3);
                                                    const originalNettoString = String((item as any)['originalNetto'] || '0.00');
                                                    const areNettosEqual = Math.abs(calculatedNetto - parseFloat(originalNettoString.replace(',', '.'))) < 0.001;
                                                    const nettoColorClass = areNettosEqual ? 'text-green-600' : 'text-red-600';

                                                    return (
                                                      <tr key={index} className="text-gray-900">
                                                          <td className="p-2 text-gray-500">{index + 1}.</td>
                                                          <td className="p-2">
                                                              <input type="text" value={String(item['ArtikelBez'] || '')} onChange={(e) => handleFieldChange(index, 'ArtikelBez', e.target.value)} className="w-32 bg-transparent p-1 focus:outline-none focus:bg-violet-50 rounded" />
                                                          </td>
                                                          <td className="p-2">
                                                              <input type="text" value={String(item['ArtikelNumber'] || '')} onChange={(e) => handleFieldChange(index, 'ArtikelNumber', e.target.value)} className="w-24 bg-transparent p-1 focus:outline-none focus:bg-violet-50 rounded font-mono" />
                                                          </td>
                                                          <td className="p-2">
                                                              <input type="text" inputMode="numeric" value={String(item['Kolli'] || '')} onChange={(e) => handleFieldChange(index, 'Kolli', e.target.value)} className="w-12 bg-transparent p-1 focus:outline-none focus:bg-violet-50 rounded text-right" />
                                                          </td>
                                                          <td className="p-2">
                                                              <input type="text" inputMode="numeric" value={String(item['Inhalt'] || '')} onChange={(e) => handleFieldChange(index, 'Inhalt', e.target.value)} className="w-12 bg-transparent p-1 focus:outline-none focus:bg-violet-50 rounded text-right" />
                                                          </td>
                                                          <td className="p-2">
                                                              <input type="text" inputMode="numeric" value={String(item['Menge'] || '')} onChange={(e) => handleFieldChange(index, 'Menge', e.target.value)} className="w-12 bg-transparent p-1 focus:outline-none focus:bg-violet-50 rounded text-right" />
                                                          </td>
                                                          <td className="p-2">
                                                              <CustomCurrencyInput value={parseFloat(String(item['Preis'] || '0'))} onValueChange={(value) => handleFieldChange(index, 'Preis', value || 0)} className="w-20 bg-transparent p-1 focus:outline-none focus:bg-violet-50 rounded text-right" />
                                                          </td>
                                                          {hasVatData && (
                                                              <td className="p-2">
                                                                  <input type="text" inputMode="numeric" value={String(item['MwSt'] || '')} onChange={(e) => handleFieldChange(index, 'MwSt', e.target.value)} className="w-12 bg-transparent p-1 focus:outline-none focus:bg-violet-50 rounded text-right" />
                                                              </td>
                                                          )}
                                                          <td className="p-2">
                                                              <CustomCurrencyInput value={calculatedNetto} onValueChange={(value) => handleFieldChange(index, 'Netto', value || 0)} className={`w-20 bg-transparent p-1 focus:outline-none focus:bg-violet-50 rounded text-right font-bold ${nettoColorClass}`} />
                                                          </td>
                                                          <td className={`p-2 font-semibold ${nettoColorClass}`}>
                                                              {originalNettoString}
                                                          </td>
                                                          <td className="p-2">
                                                              <div className="flex items-center gap-1">
                                                                  <button onClick={() => onAddItem(index)} className="p-1.5 text-green-500 hover:bg-green-100 rounded-full"><PlusCircle size={16} /></button>
                                                                  <button onClick={() => onDeleteItem(index)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={16} /></button>
                                                              </div>
                                                          </td>
                                                      </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                      )}
                      
                      {/* Özet */}
                      <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2 px-4">{t('summary')}</h3>
                           <div className="bg-white p-4 rounded-lg border shadow-sm">
                              {invoiceSummary && invoiceSummary !== null && Object.keys(invoiceSummary).length > 0 ? (
                                  <>
                                      {/* KDV %7 - Opsiyonel */}
                                      {invoiceSummary.vat_7 !== undefined && (
                                          <div className="flex justify-between py-1.5 border-b">
                                              <span className="font-medium text-gray-600">KDV %7:</span>
                                              <span className="font-bold text-gray-800">{Number(invoiceSummary.vat_7).toFixed(3)}€</span>
                                          </div>
                                      )}
                                      
                                      {/* KDV %19 - Opsiyonel */}
                                      {invoiceSummary.vat_19 !== undefined && (
                                          <div className="flex justify-between py-1.5 border-b">
                                              <span className="font-medium text-gray-600">KDV %19:</span>
                                              <span className="font-bold text-gray-800">{Number(invoiceSummary.vat_19).toFixed(3)}€</span>
                                          </div>
                                      )}
                                      
                                      {/* Toplam KDV - Zorunlu */}
                                      {invoiceSummary.total_vat !== undefined && (
                                          <div className="flex justify-between py-1.5 border-b">
                                              <span className="font-medium text-gray-600">Toplam KDV:</span>
                                              <span className="font-bold text-gray-800">{Number(invoiceSummary.total_vat).toFixed(3)}€</span>
                                          </div>
                                      )}
                                      
                                      {/* Toplam Net - Zorunlu */}
                                      {invoiceSummary.total_net !== undefined && (
                                          <div className="flex justify-between py-1.5 border-b">
                                              <span className="font-medium text-gray-600">Toplam Net Tutar:</span>
                                              <span className="font-bold text-gray-800">{Number(invoiceSummary.total_net).toFixed(3)}€</span>
                                          </div>
                                      )}
                                      
                                      {/* Toplam Brüt - Zorunlu */}
                                      {invoiceSummary.total_gross !== undefined && (
                                          <div className="flex justify-between py-1.5">
                                              <span className="font-medium text-gray-600">Toplam Brüt Tutar:</span>
                                              <span className="font-bold text-gray-800">{Number(invoiceSummary.total_gross).toFixed(3)}€</span>
                                          </div>
                                      )}
                                  </>
                              ) : (
                                  <div className="text-center py-4 text-gray-500">
                                      <p>Bu sayfada finansal özet bilgisi bulunmuyor.</p>
                                      <p className="text-sm mt-1">Özet bilgileri genellikle fatura sonunda yer alır.</p>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Hesaplanmış Özet */}
                      {hasInvoiceData && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2 px-4">{t('calculatedSummary')}</h3>
                          <div className="bg-white p-4 rounded-lg border shadow-sm">
                            <div className="flex justify-between py-1.5">
                              <span className="font-medium text-gray-600">{t('calculatedTotal')}:</span>
                              <span className={`font-bold ${colorClass}`}>{calculatedTotal}€</span>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
              )}
              {activeTab === 'json' && (
                  <pre className="bg-gray-800 text-white p-4 rounded-lg text-xs overflow-x-auto">
                      <code>
                          {JSON.stringify({ invoiceSummary, invoiceData }, null, 2)}
                      </code>
                  </pre>
              )}
          </div>
      </div>
  );
}

const DetailInput = ({ label, className, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="flex flex-col">
    <label className="font-medium text-gray-500 text-[11px] leading-tight mb-0.5">{label}</label>
    <input 
      {...props}
      onFocus={(e) => setTimeout(() => e.target.select(), 0)}
      className={`bg-transparent p-0 focus:outline-none focus:bg-violet-50 rounded px-1 min-w-0 ${className}`} 
    />
  </div>
);

const CustomCurrencyInput = ({ 
  value, 
  onValueChange, 
  className, 
  asDetail,
  label
}: { 
  value: number; 
  onValueChange: (value: number) => void; 
  className?: string; 
  asDetail?: boolean;
  label?: string;
}) => {
  const [displayValue, setDisplayValue] = useState('');

  const format = (num: number) => {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(num);
  };
  
  useEffect(() => {
    setDisplayValue(format(value));
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      const currentNum = Math.round(value * 1000);
      const newNum = currentNum * 10 + parseInt(e.key, 10);
      onValueChange(newNum / 1000);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      const currentNum = Math.round(value * 1000);
      const newNum = Math.floor(currentNum / 10);
      onValueChange(newNum / 1000);
    } else if (e.key === 'Delete' || e.key === 'Clear') {
      e.preventDefault();
      onValueChange(0);
    }
  };
  
  const input = <input type="text" value={displayValue} onChange={() => {}} onKeyDown={handleKeyDown} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className={className} />;

  if (asDetail && label) {
    return (
      <div className="flex flex-col">
        <label className="font-medium text-gray-500 text-[11px] leading-tight mb-0.5">{label}</label>
        {input}
      </div>
    );
  }
  
  return input;
};
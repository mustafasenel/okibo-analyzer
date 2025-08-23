'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { PlusCircle, Trash2 } from 'lucide-react';

// Bu component'in beklediği prop'ların tipini tanımlıyoruz
type InvoiceData = {
  invoice_meta?: Record<string, string | number>;
  invoice_data?: Record<string, string | number>[];
  invoice_summary?: Record<string, string | number>;
};

interface ReviewDataTabsProps {
  data: InvoiceData;
  onItemChange: (index: number, field: string, value: string | number) => void;
  onAddItem: (index: number) => void;
  onDeleteItem: (index: number) => void;
}

// Component tanımında prop'ların tipini belirtiyoruz
export default function ReviewDataTabs({ data, onItemChange, onAddItem, onDeleteItem }: ReviewDataTabsProps) {
  const t = useTranslations('ReviewDataTabs');
  const t_abbr = useTranslations('ReviewDataTabs.abbreviations');
  const [activeTab, setActiveTab] = useState<'table' | 'json'>('table');

  if (!data) {
    return null;
  }

  const hasMetaData = data.invoice_meta && Object.keys(data.invoice_meta).length > 0;
  const hasInvoiceData = Array.isArray(data.invoice_data) && data.invoice_data.length > 0;
  const hasSummaryData = data.invoice_summary && Object.keys(data.invoice_summary).length > 0;

  const calculatedTotal = hasInvoiceData
    ? data.invoice_data!
        .reduce((acc, item) => {
          const nettoValue = parseFloat(String(item.Netto || '0').replace(',', '.'));
          return acc + (isNaN(nettoValue) ? 0 : nettoValue);
        }, 0)
        .toFixed(2)
    : '0.00';

  const ocrSubtotal = data.invoice_summary?.Zwischensumme 
    ? parseFloat(String(data.invoice_summary.Zwischensumme).replace(',', '.'))
    : null;

  const totalsMatch = ocrSubtotal !== null && parseFloat(calculatedTotal) === ocrSubtotal;

  const colorClass = totalsMatch ? 'text-green-600' : 'text-red-600';

  if (!hasMetaData && !hasInvoiceData && !hasSummaryData) {
    return (
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-700">{t('noDataTitle')}</h3>
            <p className="text-gray-500 mt-2">{t('noDataMessage')}</p>
        </div>
    );
  }

  return (
    <div>
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
                              {Object.entries(data.invoice_meta!).map(([key, value]) => (
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
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2 px-4">{t('products', { count: data.invoice_data!.length })}</h3>
                        <div className="bg-white rounded-lg border shadow-sm divide-y">
                          {data.invoice_data!.map((item, index) => (
                            <div key={index} className="p-3 relative group">
                              {/* Üst Satır: Ana Bilgiler */}
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-sm text-gray-400">{index + 1}.</span>
                                <input 
                                  type="text"
                                  value={String(item['ArtikelBez'] || '')}
                                  onChange={(e) => onItemChange(index, 'ArtikelBez', e.target.value)}
                                  className="flex-grow font-semibold text-gray-800 bg-transparent p-0 focus:outline-none focus:bg-violet-50 rounded px-1"
                                  placeholder={t('noNameProduct')}
                                  onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                                />
                                <CustomCurrencyInput
                                  value={parseFloat(String(item['Netto'] || '0'))}
                                  onValueChange={(value) => onItemChange(index, 'Netto', value || 0)}
                                  className="w-24 min-w-0 font-bold text-lg text-violet-600 bg-transparent p-0 focus:outline-none focus:bg-violet-50 rounded text-right pr-1"
                                />
                              </div>
                              {/* Alt Satır: Detaylar */}
                              <div className="flex items-end flex-wrap gap-x-4 gap-y-1 mt-1 pl-7 text-xs text-gray-600">
                                <DetailInput label={t_abbr('artikel')} value={String(item['ArtikelNumber'] || '')} onChange={e => onItemChange(index, 'ArtikelNumber', e.target.value)} className="w-24 font-mono" />
                                <DetailInput label={t_abbr('kolli')} type="text" inputMode="numeric" value={String(item['Kolli'] || '')} onChange={e => onItemChange(index, 'Kolli', e.target.value)} className="w-10" />
                                <DetailInput label={t_abbr('inhalt')} type="text" inputMode="numeric" value={String(item['Inhalt'] || '')} onChange={e => onItemChange(index, 'Inhalt', e.target.value)} className="w-10" />
                                <DetailInput label={t_abbr('menge')} type="text" inputMode="numeric" value={String(item['Menge'] || '')} onChange={e => onItemChange(index, 'Menge', e.target.value)} className="w-10" />
                                <CustomCurrencyInput
                                  asDetail
                                  label={t_abbr('preis')}
                                  value={parseFloat(String(item['Preis'] || '0'))}
                                  onValueChange={(value) => onItemChange(index, 'Preis', value || 0)}
                                  className="w-16"
                                />
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
                      </div>
                    )}
                    
                    {/* Özet */}
                    {hasSummaryData && (
                      <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2 px-4">{t('summary')}</h3>
                           <div className="bg-white p-4 rounded-lg border shadow-sm">
                              {Object.entries(data.invoice_summary!).map(([key, value]) => {
                                  const isSubtotal = key === 'Zwischensumme';
                                  return (
                                    <div key={key} className="flex justify-between py-1.5 border-b last:border-b-0">
                                        <span className="font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                                        <span className={`font-bold ${isSubtotal ? colorClass : 'text-gray-800'}`}>
                                          {String(value ?? 'N/A')}
                                        </span>
                                    </div>
                                  );
                              })}
                          </div>
                      </div>
                    )}

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
                        {JSON.stringify(data, null, 2)}
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };
  
  useEffect(() => {
    setDisplayValue(format(value));
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      const currentNum = Math.round(value * 100);
      const newNum = currentNum * 10 + parseInt(e.key, 10);
      onValueChange(newNum / 100);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      const currentNum = Math.round(value * 100);
      const newNum = Math.floor(currentNum / 10);
      onValueChange(newNum / 100);
    } else if (e.key === 'Delete' || e.key === 'Clear') {
      e.preventDefault();
      onValueChange(0);
    }
  };
  
  const input = <input type="text" value={displayValue} onKeyDown={handleKeyDown} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className={className} />;

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
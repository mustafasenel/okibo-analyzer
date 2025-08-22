'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

// Bu component'in beklediği prop'ların tipini tanımlıyoruz
type InvoiceData = {
  invoice_meta?: Record<string, string | number>;
  invoice_data?: Record<string, string | number>[];
  invoice_summary?: Record<string, string | number>;
};

interface ReviewDataTabsProps {
  data: InvoiceData;
}

// Component tanımında prop'ların tipini belirtiyoruz
export default function ReviewDataTabs({ data }: ReviewDataTabsProps) {
  const t = useTranslations('ReviewDataTabs');
  const [activeTab, setActiveTab] = useState<'table' | 'json'>('table');

  if (!data) {
    return null;
  }

  const hasMetaData = data.invoice_meta && Object.keys(data.invoice_meta).length > 0;
  const hasInvoiceData = Array.isArray(data.invoice_data) && data.invoice_data.length > 0;
  const hasSummaryData = data.invoice_summary && Object.keys(data.invoice_summary).length > 0;
  
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
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('invoiceInfo')}</h3>
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
        
                    {/* Kompakt Mobil Tablo */}
                    {hasInvoiceData && (
                      <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('products', { count: data.invoice_data!.length })}</h3>
                          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                            {/* Başlık Satırı */}
                            <div className="flex items-center p-2 bg-gray-50 text-xs font-bold text-gray-500">
                                <div className="w-8 flex-shrink-0 text-center">#</div>
                                <div className="flex-grow flex items-center mx-2">
                                  <div className="w-20 sm:w-24 flex-shrink-0">{t('productCode')}</div>
                                  <div className="flex-grow">{t('productName')}</div>
                                </div>
                                <div className="w-24 flex-shrink-0 text-right">{t('amount')}</div>
                            </div>
                            {/* Veri Satırları */}
                            {data.invoice_data!.map((row, rowIndex) => (
                              <div key={rowIndex} className="flex items-center p-3 border-t">
                                {/* Sütun 1: Sıra No */}
                                <div className="w-8 flex-shrink-0 text-center text-sm text-gray-400 font-medium">
                                  {rowIndex + 1}
                                </div>

                                {/* Sütun 2: Ürün Bilgileri */}
                                <div className="flex-grow flex items-center mx-2">
                                  <div className="w-20 sm:w-24 flex-shrink-0 font-mono text-xs text-gray-500 pr-2">
                                    {String(row['ArtikelNumber'] || '-')}
                                  </div>
                                  <div className="flex-grow font-bold text-gray-800 leading-tight">
                                    {String(row['ArtikelBez'] || t('noNameProduct'))}
                                  </div>
                                </div>

                                {/* Sütun 3: Fiyat Bilgileri (KOLİ BİLGİSİ EKLENDİ) */}
                                <div className="w-24 flex-shrink-0 text-right">
                                  <p className="font-bold text-base text-violet-600">
                                    {String(row['Netto'] || '0.00')}€
                                  </p>
                                  {/* --- DEĞİŞİKLİK BURADA --- */}
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    <span className="font-semibold">{String(row['Kolli'] || '0')} {t('boxes')}</span>
                                    <span className="mx-1 text-gray-300">|</span>
                                    <span>{String(row['Menge'] || '0')}x{String(row['Preis'] || '0.00')}</span>
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                      </div>
                    )}
                    
                    {/* Özet */}
                    {hasSummaryData && (
                      <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('summary')}</h3>
                           <div className="bg-white p-4 rounded-lg border shadow-sm">
                              {Object.entries(data.invoice_summary!).map(([key, value]) => (
                                  <div key={key} className="flex justify-between py-1.5 border-b last:border-b-0">
                                      <span className="font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                                      <span className="font-bold text-gray-800">{String(value ?? 'N/A')}</span>
                                  </div>
                              ))}
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
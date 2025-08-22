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
        
                    {/* Kompakt ve Mobil Uyumlu İki Satırlı Tasarım */}
                    {hasInvoiceData && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('products', { count: data.invoice_data!.length })}</h3>
                        <div className="bg-white rounded-lg border shadow-sm">
                          {data.invoice_data!.map((item, index) => (
                            <div key={index} className="flex items-center p-3 border-b last:border-b-0">
                              {/* Sol Taraf: Ürün Kodu/Sıra ve Adı */}
                              <div className="flex-grow mr-3 min-w-0">
                                {/* Üst Satır: Sıra No ve Artikel No */}
                                <div className="flex items-center text-xs text-gray-500 font-mono">
                                  <span className="font-semibold text-gray-400 w-6 text-left">{index + 1}.</span>
                                  <span>{String(item['ArtikelNumber'] || '-')}</span>
                                </div>
                                {/* Alt Satır: Ürün Adı */}
                                <p className="font-semibold text-gray-800 leading-tight truncate mt-0.5">
                                  {String(item['ArtikelBez'] || t('noNameProduct'))}
                                </p>
                              </div>
                              
                              {/* Orta Taraf: Koli, Miktar, Fiyat */}
                              <div className="text-xs text-gray-600 text-right flex-shrink-0">
                                <p>
                                  {String(item['Kolli'] || '0')} x {String(item['Inhalt'] || '0')}
                                </p>
                                <p className="mt-0.5">
                                  <span className="font-semibold">{String(item['Menge'] || '0')}</span> x {String(item['Preis'] || '0.00')}€
                                </p>
                              </div>

                              {/* En Sağ Taraf: Net Tutar */}
                              <div className="text-right ml-2 w-20 flex-shrink-0">
                                <p className="font-bold text-base text-violet-600">
                                  {String(item['Netto'] || '0.00')}€
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
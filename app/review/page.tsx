'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReviewDataTabs from '@/components/review/ReviewDataTabs';
import { Check, X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Bu tip tanımının burada da olması gerekiyor
type InvoiceData = {
  invoice_meta?: Record<string, string | number>;
  invoice_data?: Record<string, string | number>[];
  invoice_summary?: Record<string, string | number>;
};

export default function ReviewPage() {
  const t = useTranslations('ReviewPage');
  const router = useRouter();
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Component yüklendiğinde sessionStorage'dan veriyi çekmek için kullanılır
  useEffect(() => {
    const resultJson = sessionStorage.getItem('analysisResult');

    if (resultJson && resultJson !== 'null') {
      try {
        setInvoiceData(JSON.parse(resultJson));
      } catch (error) {
        console.error("sessionStorage'daki JSON verisi bozuk:", error);
        router.replace('/'); // Hatalı veri varsa ana sayfaya dön
      }
    } else {
      // Eğer incelenecek veri yoksa, kullanıcıyı ana sayfaya geri gönder
      router.replace('/');
    }
  }, [router]);

  const handleItemChange = (index: number, field: string, value: string | number) => {
    if (!invoiceData || !invoiceData.invoice_data) return;

    const updatedItems = [...invoiceData.invoice_data];
    const currentItem = { ...updatedItems[index], [field]: value };

    // Otomatik Miktar (Menge) hesaplaması
    if (field === 'Kolli' || field === 'Inhalt') {
      const kolli = parseInt(String(currentItem['Kolli'] || '0'), 10) || 0;
      const inhalt = parseInt(String(currentItem['Inhalt'] || '0'), 10) || 0;
      currentItem['Menge'] = kolli * inhalt;
    }

    // Otomatik Net Tutar (Netto) hesaplaması
    // Bu, Miktar'ın otomatik güncellendiği durumları da yakalar
    if (field === 'Kolli' || field === 'Inhalt' || field === 'Menge' || field === 'Preis') {
      const menge = parseInt(String(currentItem['Menge'] || '0'), 10) || 0;
      const preis = parseFloat(String(currentItem['Preis'] || '0').replace(',', '.')) || 0;
      currentItem['Netto'] = (menge * preis).toFixed(2);
    }

    updatedItems[index] = currentItem;

    setInvoiceData({
      ...invoiceData,
      invoice_data: updatedItems,
    });
  };

  const handleAddItem = (index: number) => {
    if (!invoiceData || !invoiceData.invoice_data) return;
    
    const newItem: Record<string, string | number> = {
        ArtikelNumber: '-',
        ArtikelBez: '',
        Kolli: 0,
        Inhalt: 0,
        Menge: 0,
        Preis: 0.00,
        Netto: 0.00,
    };

    const updatedData = { ...invoiceData };
    const updatedItems = [...updatedData.invoice_data];
    updatedItems.splice(index + 1, 0, newItem); // Insert after the current item
    updatedData.invoice_data = updatedItems;

    setInvoiceData(updatedData);
  };

  const handleDeleteItem = (index: number) => {
    if (!invoiceData || !invoiceData.invoice_data) return;

    const updatedData = { ...invoiceData };
    const updatedItems = [...updatedData.invoice_data];
    updatedItems.splice(index, 1); // Remove the item at the given index
    updatedData.invoice_data = updatedItems;

    setInvoiceData(updatedData);
  };

  const handleSaveToDb = async () => {
    setIsSaving(true);
    console.log("Veritabanına kaydedilecek veri:", invoiceData);
    // GELECEKTEKİ ADIM: Burada veritabanına kaydetme API'si çağrılacak
    // await fetch('/api/save-invoice', { method: 'POST', body: JSON.stringify(invoiceData) });
    
    // Şimdilik 2 saniye bekleyip başarılı hissi verelim
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    sessionStorage.removeItem('analysisResult'); // İşlem sonrası veriyi temizle
    setIsSaving(false);
    router.push('/');
  };

  const handleDiscard = () => {
    sessionStorage.removeItem('analysisResult');
    router.push('/');
  };

  // Veri henüz yüklenmediyse bir yükleme animasyonu göster
  if (!invoiceData) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-violet-600"/>
        <p className="mt-4 text-gray-600">{t('loading')}</p>
      </div>
    );
  }

  // Veri yüklendikten sonra ana içeriği göster
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4 px-4">{t('title')}</h1>
      
      {/* 
        İçeriğin butonlar tarafından ezilmemesi için mobil cihazlarda altta boşluk bırakıyoruz.
        mb-24 -> 6rem boşluk bırakır. Bu, 4rem'lik navigasyon + 1rem'lik buton + 1rem ekstra boşluk.
      */}
      <div className="mb-24 sm:mb-8">
        <ReviewDataTabs 
          data={invoiceData}
          onItemChange={handleItemChange}
          onAddItem={handleAddItem}
          onDeleteItem={handleDeleteItem}
        />
      </div>

      {/* Onay/Red Butonları */}
      <div className="flex gap-4 fixed bottom-20 left-4 right-4 z-10 sm:static">
        <button
          onClick={handleDiscard}
          className="flex-1 bg-red-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-red-600 shadow-lg"
        >
          <X className="h-5 w-5" />
          <span>{t('discardButton')}</span>
        </button>
        <button
          onClick={handleSaveToDb}
          disabled={isSaving}
          className="flex-1 bg-green-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-green-600 disabled:bg-gray-400 shadow-lg"
        >
          {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Check className="h-5 w-5" />}
          <span>{t('confirmButton')}</span>
        </button>
      </div>
    </div>
  );
}
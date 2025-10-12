'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReviewDataTabs from '@/components/review/ReviewDataTabs';
import ImageSheet from '@/components/review/ImageSheet'; // Import the new component
import { saveInvoice } from './actions'; // Import the new Server Action
import { Check, X, Loader2, FileImage } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button'; // Import Shadcn Button
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip components
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Bu tip tanımının burada da olması gerekiyor
type InvoiceData = {
  invoice_meta?: Record<string, string | number>;
  invoice_data?: Record<string, string | number>[];
  invoice_summary?: Record<string, string | number>;
};

export default function ReviewPage() {
  const t = useTranslations('ReviewPage');
  const t_sheet = useTranslations('ReviewDataTabs.sheet');
  const router = useRouter();
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [invoiceImages, setInvoiceImages] = useState<string[]>([]); // State for images
  const [isSheetOpen, setIsSheetOpen] = useState(false); // State for sheet visibility
  const [companyCode, setCompanyCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null); // State for saving error
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Component yüklendiğinde sessionStorage'dan veriyi çekmek için kullanılır
  useEffect(() => {
    const resultJson = sessionStorage.getItem('analysisResult');
    const imagesJson = sessionStorage.getItem('invoiceImages'); // Get images

    if (imagesJson) {
        setInvoiceImages(JSON.parse(imagesJson));
    }

    if (resultJson && resultJson !== 'null') {
      try {
        const parsedData = JSON.parse(resultJson);
        // Orijinal Netto değerlerini saklamak için veriyi işleyelim
        if (parsedData.invoice_data) {
          parsedData.invoice_data = parsedData.invoice_data.map((item: any) => ({
            ...item,
            originalNetto: item.Netto // Orijinal değeri yeni bir alana kopyala
          }));
        }
        setInvoiceData(parsedData);
      } catch (error) {
        console.error("sessionStorage'daki JSON verisi bozuk:", error);
        router.replace('/'); // Hatalı veri varsa ana sayfaya dön
      }
    } else {
      // Eğer incelenecek veri yoksa, kullanıcıyı ana sayfaya geri gönder
      router.replace('/');
    }

    const savedCompanyCode = localStorage.getItem('companyCode');
    setCompanyCode(savedCompanyCode);

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
      currentItem['Netto'] = (menge * preis).toFixed(3);
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
    if (!invoiceData) return;

    setIsSaving(true);
    setError(null);

    if (!companyCode) {
      setError('Firma kodu bulunamadı. Lütfen ayarlardan bir firma kodu belirleyin.');
      setIsSaving(false);
      return;
    }

    try {
      const result = await saveInvoice(invoiceData, companyCode);

      if (result.success) {
        setIsSuccessModalOpen(true); // Show success modal instead of redirecting
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    sessionStorage.removeItem('analysisResult');
    sessionStorage.removeItem('invoiceImages'); // Görselleri de temizle
    router.push('/');
  };

  const handleModalConfirm = () => {
    sessionStorage.removeItem('analysisResult');
    sessionStorage.removeItem('invoiceImages');
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
  const isSaveDisabled = isSaving || !companyCode;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4 px-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      </div>
      
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
        {error && <p className="text-red-500 mt-4 px-4">{error}</p>}
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
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex-1">
                <button
                  onClick={handleSaveToDb}
                  disabled={isSaveDisabled}
                  className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
                >
                  {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Check className="h-5 w-5" />}
                  <span>{t('confirmButton')}</span>
                </button>
              </div>
            </TooltipTrigger>
            {isSaveDisabled && !isSaving && (
              <TooltipContent>
                <p>{t('companyCodeTooltip')}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

      </div>

      {/* Floating "View Invoice" Button */}
      <Button 
        variant="outline" 
        onClick={() => setIsSheetOpen(true)} 
        disabled={invoiceImages.length === 0}
        className="fixed bottom-24 right-4 z-20 h-14 w-14 rounded-full shadow-lg bg-white"
      >
          <FileImage size={24} />
      </Button>

      <ImageSheet 
        images={invoiceImages}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />

      <AlertDialog open={isSuccessModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('saveSuccessTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('saveSuccessDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleModalConfirm}>{t('saveSuccessConfirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
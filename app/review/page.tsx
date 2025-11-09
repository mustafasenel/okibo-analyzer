'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReviewDataTabs from '@/components/review/ReviewDataTabs';
import ImageSheet from '@/components/review/ImageSheet'; // Import the new component
import { saveInvoice, updateInvoice } from './actions'; // Import the new Server Action
import { Check, X, Loader2, FileImage } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button'; // Import Shadcn Button
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip components
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { InvoiceData, InvoiceItem, InvoiceMeta, InvoiceSummary } from '@/types/invoice';

// Define the structure for a page of invoice data
interface InvoicePage {
    page: number;
    items: InvoiceItem[];
}

export default function ReviewPage() {
    const t = useTranslations('ReviewPage');
    const t_sheet = useTranslations('ReviewDataTabs.sheet');
    const router = useRouter();
    const [invoiceMeta, setInvoiceMeta] = useState<InvoiceMeta | null>(null);
    const [invoiceData, setInvoiceData] = useState<InvoicePage[]>([]); // State now holds an array of pages
    const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(null);
    const [invoiceImages, setInvoiceImages] = useState<string[]>([]);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isSaveDisabled, setIsSaveDisabled] = useState(true);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [currentPageIndex, setCurrentPageIndex] = useState(0); // State to track the current page

    // Component yüklendiğinde sessionStorage'dan veriyi çekmek için kullanılır
    useEffect(() => {
        const resultJson = sessionStorage.getItem('analysisResult');
        const imagesJson = sessionStorage.getItem('invoiceImages'); // Get images
        const editingId = sessionStorage.getItem('editingInvoiceId'); // Check if editing mode

        console.log('🔍 useEffect - editingId:', editingId);
        console.log('🔍 useEffect - resultJson:', resultJson ? 'var' : 'yok');

        // Editing mode kontrolü
        if (editingId && !resultJson) {
            // Geçmişten fatura açıldı - veritabanından veri çek
            console.log('📖 Geçmişten fatura açıldı, veritabanından veri çekiliyor...');
            setIsEditingMode(true);
            setEditingInvoiceId(editingId);
            
            // Veritabanından fatura verisini çek
            fetch(`/api/invoices/${editingId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.invoice) {
                        console.log('✅ Fatura verisi veritabanından çekildi');
                        setInvoiceData(data.invoice.invoiceData);
                        setInvoiceMeta(data.invoice.invoiceMeta);
                        setInvoiceSummary(data.invoice.invoiceSummary);
                        
                        // Görselleri de çek
                        console.log('🖼️ Görseller çekiliyor...');
                        return fetch(`/api/invoices/images?invoiceId=${editingId}`);
                    } else {
                        console.error('❌ Fatura verisi çekilemedi:', data.error);
                        router.replace('/history');
                        throw new Error('Fatura verisi çekilemedi');
                    }
                })
                .then(response => response.json())
                .then(imageData => {
                    if (imageData.success && imageData.images) {
                        console.log(`✅ ${imageData.images.length} görsel çekildi`);
                        // Görselleri Base64 data URL formatına çevir
                        const base64Images = imageData.images.map((img: any) => 
                            `data:${img.mimeType};base64,${img.data}`
                        );
                        setInvoiceImages(base64Images);
                    } else {
                        console.log('ℹ️ Bu faturada görsel yok');
                        setInvoiceImages([]);
                    }
                })
                .catch(error => {
                    console.error('❌ Veri çekilirken hata:', error);
                    router.replace('/history');
                });
        } else if (editingId && resultJson) {
            // Eğer hem editingId hem de analysisResult varsa, yeni tarama yapılmış demektir
            console.log('🔄 Yeni tarama yapılmış, editing mode temizleniyor');
            sessionStorage.removeItem('editingInvoiceId');
            setIsEditingMode(false);
            setEditingInvoiceId(null);
        }

        if (imagesJson) {
            setInvoiceImages(JSON.parse(imagesJson));
        }

        if (resultJson && resultJson !== 'null' && !editingId) {
          try {
            const parsedData: InvoiceData = JSON.parse(resultJson);
            
            setInvoiceData(parsedData.invoiceData);
            setInvoiceMeta(parsedData.invoiceMeta);
            setInvoiceSummary(parsedData.invoiceSummary);
          } catch (error) {
            console.error("sessionStorage'daki JSON verisi bozuk:", error);
            router.replace('/'); // Hatalı veri varsa ana sayfaya dön
          }
        } else if (!resultJson && !editingId) {
          // Eğer ne incelenecek veri ne de editingId varsa, kullanıcıyı ana sayfaya geri gönder
          router.replace('/');
        }

        const savedCompanyCode = localStorage.getItem('companyCode');
        setIsSaveDisabled(!savedCompanyCode); // Disable button if no code
    }, [router]);

    const handleItemChange = (index: number, updatedItem: InvoiceItem) => {
        const newData = [...invoiceData];
        const currentPageItems = [...newData[currentPageIndex].items];

        // Apply automatic calculations
        const currentItem = { ...updatedItem };
        const kolli = parseInt(String(currentItem['Kolli'] || '0'), 10) || 0;
        const inhalt = parseInt(String(currentItem['Inhalt'] || '0'), 10) || 0;
        currentItem['Menge'] = kolli * inhalt;

        const menge = currentItem['Menge'];
        const preis = parseFloat(String(currentItem['Preis'] || '0').replace(',', '.')) || 0;
        currentItem['Netto'] = (menge * preis).toFixed(3);

        currentPageItems[index] = currentItem;
        newData[currentPageIndex].items = currentPageItems;
        setInvoiceData(newData);
    };

    const handleAddItem = (index: number) => {
        const newData = [...invoiceData];
        const currentPageItems = [...newData[currentPageIndex].items];
        // Check if current data has VAT information
        const hasVatInCurrentData = invoiceData.some(page => 
            page.items.some(item => item.MwSt !== undefined && item.MwSt !== null)
        );
        
        const newItem: InvoiceItem = {
            ArtikelNumber: '-',
            ArtikelBez: '',
            Kolli: 0,
            Inhalt: 0,
            Menge: 0,
            Preis: "0.000",
            Netto: "0.000",
            ...(hasVatInCurrentData && { MwSt: 19 }), // Only add VAT if other items have it
            originalNetto: "0.000"
        };
        currentPageItems.splice(index + 1, 0, newItem);
        newData[currentPageIndex].items = currentPageItems;
        setInvoiceData(newData);
    };

    const handleDeleteItem = (index: number) => {
        const newData = [...invoiceData];
        const currentPageItems = [...newData[currentPageIndex].items];
        currentPageItems.splice(index, 1);
        newData[currentPageIndex].items = currentPageItems;
        setInvoiceData(newData);
    };

    const handleSaveToDb = async () => {
        const companyCode = localStorage.getItem('companyCode');
        if (!companyCode) {
            console.error("Firma kodu bulunamadı.");
            return;
        }

        setIsSaving(true); // Loading başlat

        try {
            // Görseller zaten Base64 formatında
            console.log(`🖼️ ${invoiceImages.length} görsel var`);
            console.log(`📊 invoiceImages tipi:`, typeof invoiceImages[0]);
            
            const imageBase64Strings: string[] = invoiceImages;

            if (isEditingMode && editingInvoiceId) {
                console.log('🔄 Mevcut fatura güncelleniyor:', editingInvoiceId);
                // Update existing invoice
                const result = await updateInvoice(editingInvoiceId, {
                    invoiceMeta,
                    invoiceData,
                    invoiceSummary,
                    images: [] // Görsel göndermeyi geçici olarak devre dışı bırak
                });

                if (result.success) {
                    setIsSuccessModalOpen(true);
                } else {
                    console.error("Güncelleme hatası:", result.error);
                }
            } else {
                console.log('💾 Yeni fatura kaydediliyor...');
                // Create new invoice
                const result = await saveInvoice({
                    invoiceMeta,
                    invoiceData,
                    invoiceSummary,
                    images: [] // Görsel göndermeyi geçici olarak devre dışı bırak
                }, companyCode);

                if (result.success) {
                    setIsSuccessModalOpen(true);
                } else {
                    console.error("Kaydetme hatası:", result.error);
                }
            }
        } catch (error) {
            console.error("Kaydetme sırasında hata:", error);
        } finally {
            setIsSaving(false); // Loading bitir
        }
    };

    const handleDiscard = () => {
        sessionStorage.removeItem('analysisResult');
        sessionStorage.removeItem('invoiceImages');
        sessionStorage.removeItem('editingInvoiceId');
        router.push(isEditingMode ? '/history' : '/');
    };

    const handleModalConfirm = () => {
        sessionStorage.removeItem('analysisResult');
        sessionStorage.removeItem('invoiceImages');
        sessionStorage.removeItem('editingInvoiceId');
        router.push(isEditingMode ? '/history' : '/');
    };
    
    // Functions to handle page navigation
    const goToNextPage = () => {
        setCurrentPageIndex((prevIndex) => Math.min(prevIndex + 1, invoiceData.length - 1));
    };

    const goToPreviousPage = () => {
        setCurrentPageIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    };


    // Veri henüz yüklenmediyse bir yükleme animasyonu göster
    if (invoiceData.length === 0) { // Changed from !invoiceData to handle empty array state
      return (
        <div className="flex flex-col justify-center items-center h-screen">
          <Loader2 className="animate-spin h-8 w-8 text-violet-600"/>
          <p className="mt-4 text-gray-600">{t('loading')}</p>
        </div>
      );
    }

    // Veri yüklendikten sonra ana içeriği göster
    // `isSaveDisabled` is now only managed by its state, so the duplicate declaration is removed.

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4 px-4">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditingMode ? t('editTitle') : t('title')}
                </h1>
            </div>
            
            {/* 
                İçeriğin butonlar tarafından ezilmemesi için mobil cihazlarda altta boşluk bırakıyoruz.
                mb-24 -> 6rem boşluk bırakır. Bu, 4rem'lik navigasyon + 1rem'lik buton + 1rem ekstra boşluk.
            */}
            <div className="mb-24 sm:mb-8">
                {invoiceData.length > 0 && invoiceMeta && (
                    <ReviewDataTabs
                        invoiceMeta={invoiceMeta}
                        invoiceSummary={invoiceSummary}
                        invoiceData={invoiceData[currentPageIndex]?.items || []} // Pass only the current page's items
                        onItemChange={handleItemChange}
                        onAddItem={handleAddItem}
                        onDeleteItem={handleDeleteItem}
                        // Pass pagination data and handlers
                        currentPage={currentPageIndex + 1}
                        totalPages={invoiceData.length}
                        onNextPage={goToNextPage}
                        onPreviousPage={goToPreviousPage}
                    />
                )}
                {/* error && <p className="text-red-500 mt-4 px-4">{error}</p> */}
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
                                    disabled={isSaveDisabled || isSaving}
                                    className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
                                >
                                    {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Check className="h-5 w-5" />}
                                    <span>{isSaving ? t('saving') : (isEditingMode ? t('updateButton') : t('confirmButton'))}</span>
                                </button>
                            </div>
                        </TooltipTrigger>
                        {isSaveDisabled && (
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
                invoiceId={editingInvoiceId || undefined}
            />

            <AlertDialog open={isSuccessModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('saveSuccessTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {isEditingMode ? t('updateSuccessMessage') : t('saveSuccessDescription')}
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
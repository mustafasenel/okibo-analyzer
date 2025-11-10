'use client';

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReviewDataTabs from '@/components/review/ReviewDataTabs';
import ImageSheet from '@/components/review/ImageSheet';
import { saveInvoice, updateInvoice } from './actions';
import { Check, X, Loader2, FileImage } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { InvoiceData, InvoiceItem, InvoiceMeta, InvoiceSummary } from '@/types/invoice';

// Tipler
interface InvoicePage {
    page: number;
    items: InvoiceItem[];
}

interface UploadedImageInfo {
    publicId: string;
    url: string;
    originalName: string;
}

export default function ReviewPage() {
    const t = useTranslations('ReviewPage');
    const router = useRouter();
    const [invoiceMeta, setInvoiceMeta] = useState<InvoiceMeta | null>(null);
    const [invoiceData, setInvoiceData] = useState<InvoicePage[]>([]);
    const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(null);
    const [invoiceImages, setInvoiceImages] = useState<UploadedImageInfo[]>([]);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isSaveDisabled, setIsSaveDisabled] = useState(true);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    useEffect(() => {
        const resultJson = sessionStorage.getItem('analysisResult');
        const imagesJson = sessionStorage.getItem('invoiceImages');
        const editingId = sessionStorage.getItem('editingInvoiceId');

        if (editingId && !resultJson) {
            // Edit mode: Fetch data from DB
            setIsEditingMode(true);
            setEditingInvoiceId(editingId);
            
            fetch(`/api/invoices/${editingId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.invoice) {
                        setInvoiceData(data.invoice.invoiceData);
                        setInvoiceMeta(data.invoice.invoiceMeta);
                        setInvoiceSummary(data.invoice.invoiceSummary);
                        // Fetch images associated with the invoice
                        return fetch(`/api/invoices/images?invoiceId=${editingId}`);
                    } else {
                        throw new Error('Failed to fetch invoice data');
                    }
                })
                .then(response => response.json())
                .then(imageData => {
                    if (imageData.success && imageData.images) {
                        // The images are already in the correct format (UploadedImageInfo)
                        setInvoiceImages(imageData.images);
                    }
                })
                .catch(error => {
                    console.error('Error fetching data in edit mode:', error);
                    router.replace('/history');
                });
        } else {
            // New scan mode
            if (editingId) {
                sessionStorage.removeItem('editingInvoiceId');
                setIsEditingMode(false);
                setEditingInvoiceId(null);
            }
            if (imagesJson) {
                setInvoiceImages(JSON.parse(imagesJson));
            }
            if (resultJson) {
                try {
                    const parsedData: InvoiceData = JSON.parse(resultJson);
                    setInvoiceData(parsedData.invoiceData);
                    setInvoiceMeta(parsedData.invoiceMeta);
                    setInvoiceSummary(parsedData.invoiceSummary);
                } catch (error) {
                    router.replace('/');
                }
            } else {
                router.replace('/');
            }
        }

        const savedCompanyCode = localStorage.getItem('companyCode');
        setIsSaveDisabled(!savedCompanyCode);
    }, [router]);

    const handleItemChange = (index: number, updatedItem: InvoiceItem) => {
        const newData = [...invoiceData];
        const currentPageItems = [...newData[currentPageIndex].items];
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
        const hasVatInCurrentData = invoiceData.some(page => page.items.some(item => item.MwSt !== undefined && item.MwSt !== null));
        const newItem: InvoiceItem = {
            ArtikelNumber: '-',
            ArtikelBez: '',
            Kolli: 0,
            Inhalt: 0,
            Menge: 0,
            Preis: "0.000",
            Netto: "0.000",
            ...(hasVatInCurrentData && { MwSt: 19 }),
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
        if (!companyCode) return;

        setIsSaving(true);

        const payload = {
            invoiceMeta,
            invoiceData,
            invoiceSummary,
            images: invoiceImages,
        };

        try {
            const result = isEditingMode && editingInvoiceId
                ? await updateInvoice(editingInvoiceId, payload)
                : await saveInvoice(payload, companyCode);

            if (result.success) {
                setIsSuccessModalOpen(true);
            } else {
                console.error("Save/Update error:", result.error);
            }
        } catch (error) {
            console.error("Failed to save to DB:", error);
        } finally {
            setIsSaving(false);
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
                images={invoiceImages.map(img => img.url)}
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
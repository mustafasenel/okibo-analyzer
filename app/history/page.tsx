'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Eye, Trash2, Calendar, FileText, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Invoice {
  id: string;
  createdAt: string;
  invoiceMeta: any;
  invoiceData: any[];
  invoiceSummary: any;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED';
  company: {
    name: string;
    code: string;
  };
}

export default function HistoryPage() {
  const t = useTranslations('HistoryPage');
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const companyCode = localStorage.getItem('companyCode');
      if (!companyCode) {
        router.push('/settings');
        return;
      }

      const response = await fetch(`/api/invoices?companyCode=${companyCode}`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      
      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    // Sadece editingInvoiceId'yi kaydet, analysisResult'ı temizle
    sessionStorage.removeItem('analysisResult');
    sessionStorage.removeItem('invoiceImages');
    sessionStorage.setItem('editingInvoiceId', invoice.id);
    router.push('/review');
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    setInvoiceToDelete(invoiceId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!invoiceToDelete) return;

    try {
      const response = await fetch(`/api/invoices/${invoiceToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete invoice');
      }

      setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete));
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">Beklemede</Badge>;
      case 'PROCESSING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">İşleniyor</Badge>;
      case 'COMPLETED':
        return <Badge variant="default">Tamamlandı</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-violet-600"/>
        <p className="mt-4 text-gray-600">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('title')}</h1>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('noInvoices')}</h3>
            <p className="text-gray-500">İlk faturanızı taramak için ana sayfaya gidin.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 truncate">
                      <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                      <span className="truncate">{invoice.company.name}</span>
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">{invoice.invoiceMeta?.Rechnungsnummer || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">{formatDate(invoice.createdAt)}</span>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(invoice.status)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewInvoice(invoice)}
                      className="text-xs sm:text-sm px-2 sm:px-3"
                    >
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline">{t('view')}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteInvoice(invoice.id)}
                      className="text-red-600 hover:text-red-700 px-2 sm:px-3"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-4 sm:px-6">
                <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Toplam Tutar:</span>
                    <span className="font-semibold">
                      {invoice.invoiceSummary?.total_gross || invoice.invoiceSummary?.Gesamtbetrag || 'N/A'}€
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sayfa Sayısı:</span>
                    <span className="font-semibold">
                      {invoice.invoiceData?.length || 0} sayfa
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('delete')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('confirmDelete')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                        {t('deleteConfirm')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

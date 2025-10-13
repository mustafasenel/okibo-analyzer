'use client';

import { useState, useTransition } from 'react';
import { deleteCompany } from '@/app/admin/(protected)/companies/actions';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Prisma } from '@prisma/client';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Trash2 } from 'lucide-react';

type Company = Prisma.Company;

interface DeleteCompanyProps {
  company: Company;
}

export function DeleteCompanyModal({ company }: DeleteCompanyProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCompany(company.id);
      if (!result.success) {
        setError(result.message ?? 'Bir hata oluştu.');
      } else {
        setError(null);
        setOpen(false);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
            <DropdownMenuItem 
                onSelect={(e) => e.preventDefault()} 
                className="text-red-600 focus:text-red-600"
            >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Sil</span>
            </DropdownMenuItem>
        </AlertDialogTrigger>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                <AlertDialogDescription>
                    Bu işlem geri alınamaz. Bu, <strong>{company.name}</strong> adlı firmayı kalıcı olarak silecek ve verilerini sunucularımızdan kaldıracaktır.
                </AlertDialogDescription>
            </AlertDialogHeader>
            {error && (
                <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                    {error}
                </div>
            )}
            <AlertDialogFooter>
                <AlertDialogCancel>İptal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                    {isPending ? 'Siliniyor...' : 'Evet, Sil'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  );
}

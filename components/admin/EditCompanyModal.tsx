'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateCompany } from '@/app/admin/(protected)/companies/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Prisma } from '@prisma/client';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Pencil } from 'lucide-react';

type Company = Prisma.Company;

interface EditCompanyFormProps {
  company: Company;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
    </Button>
  );
}

export function EditCompanyModal({ company }: EditCompanyFormProps) {
  const [open, setOpen] = useState(false);
  const initialState = { errors: {}, message: null, success: false };
  
  const updateCompanyWithId = updateCompany.bind(null, company.id);
  const [state, dispatch] = useActionState(updateCompanyWithId, initialState);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state.success]);
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>Düzenle</span>
            </DropdownMenuItem>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[480px]">
            <form action={dispatch}>
                <DialogHeader>
                    <DialogTitle>Firma Düzenle</DialogTitle>
                    <DialogDescription>
                        Firma bilgilerini güncelleyin. Kaydetmek için değişiklikleri tamamlayın.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Firma Adı</Label>
                        <Input id="name" name="name" defaultValue={company.name} />
                        {state.errors?.name && <p className="text-sm text-red-500">{state.errors.name[0]}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="code">Firma Kodu</Label>
                        <Input id="code" name="code" defaultValue={company.code} />
                        {state.errors?.code && <p className="text-sm text-red-500">{state.errors.code[0]}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="monthlyScanLimit">Aylık Tarama Limiti</Label>
                        <Input id="monthlyScanLimit" name="monthlyScanLimit" type="number" defaultValue={company.monthlyScanLimit} />
                        {state.errors?.monthlyScanLimit && <p className="text-sm text-red-500">{state.errors.monthlyScanLimit[0]}</p>}
                    </div>
                </div>
                {state.message && !state.success && <p className="text-sm text-red-500">{state.message}</p>}
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                    <SubmitButton />
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}

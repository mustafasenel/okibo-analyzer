'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createCompany } from '@/app/admin/(protected)/companies/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';

interface NewCompanyFormProps {
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Oluşturuluyor...' : 'Firma Oluştur'}
    </Button>
  );
}

export function NewCompanyModal({ onSuccess, open, onOpenChange }: NewCompanyFormProps) {
  const initialState = { errors: {}, message: null, success: false };
  const [state, dispatch] = useActionState(createCompany, initialState);
  const [companyCode, setCompanyCode] = useState('');

  useEffect(() => {
    if (state.success) {
      onSuccess();
      setCompanyCode(''); // Reset code on success
    }
  }, [state.success, onSuccess]);
  
  const generateRandomCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setCompanyCode(code);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
            <Button>Yeni Firma Ekle</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[480px]">
            <form action={dispatch}>
                <DialogHeader>
                    <DialogTitle>Yeni Firma Oluştur</DialogTitle>
                    <DialogDescription>
                        Yeni bir müşteri firması oluşturmak için aşağıdaki bilgileri doldurun.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Firma Adı</Label>
                        <Input id="name" name="name" placeholder="Örn: Okibo GmbH" />
                        {state.errors?.name && <p className="text-sm text-red-500">{state.errors.name[0]}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="code">Firma Kodu</Label>
                        <div className="relative">
                           <Input id="code" name="code" placeholder="Benzersiz bir kod, örn: OKIBO" value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} />
                           <Button type="button" variant="ghost" size="icon" className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2" onClick={generateRandomCode}>
                               <RefreshCw className="h-4 w-4" />
                               <span className="sr-only">Kod Üret</span>
                           </Button>
                        </div>
                        {state.errors?.code && <p className="text-sm text-red-500">{state.errors.code[0]}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="monthlyScanLimit">Aylık Tarama Limiti</Label>
                        <Input id="monthlyScanLimit" name="monthlyScanLimit" type="number" defaultValue="100" />
                        {state.errors?.monthlyScanLimit && <p className="text-sm text-red-500">{state.errors.monthlyScanLimit[0]}</p>}
                    </div>
                </div>
                {state.message && !state.success && <p className="text-sm text-red-500 mt-4">{state.message}</p>}
                 <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>İptal</Button>
                    <SubmitButton />
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}

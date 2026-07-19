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
import type { Company, Model, Package } from '@prisma/client';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Pencil } from 'lucide-react';

interface EditCompanyFormProps {
  company: Company;
  models: Model[];
  packages: Package[];
}

const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
    </Button>
  );
}

export function EditCompanyModal({ company, models, packages }: EditCompanyFormProps) {
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
                        <Label htmlFor="packageId">Paket</Label>
                        <select id="packageId" name="packageId" className={selectClass} defaultValue={company.packageId ?? ''}>
                            <option value="">— Paket yok —</option>
                            {packages.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} ({p.monthlyCredits} kredi)</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="modelId">Model</Label>
                        <select id="modelId" name="modelId" className={selectClass} defaultValue={company.modelId ?? ''}>
                            <option value="">— Varsayılan model —</option>
                            {models.map((m) => (
                                <option key={m.id} value={m.id}>{m.displayName} (×{m.creditMultiplier})</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="monthlyCredits">Aylık Kredi</Label>
                        <Input id="monthlyCredits" name="monthlyCredits" type="number" defaultValue={company.monthlyCredits} />
                        {state.errors?.monthlyCredits && <p className="text-sm text-red-500">{state.errors.monthlyCredits[0]}</p>}
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

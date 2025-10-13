'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { createCompany } from '@/app/admin/(protected)/companies/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? 'Oluşturuluyor...' : 'Firma Oluştur'}
    </Button>
  );
}

export default function NewCompanyPage() {
  const initialState = { errors: {}, message: null, success: false };
  const [state, dispatch] = useActionState(createCompany, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      // Optionally show a success toast here
      router.push('/admin/dashboard');
    }
  }, [state.success, router]);
  
  return (
    <form action={dispatch} className="max-w-4xl mx-auto">
       <div className="flex items-center gap-4 mb-4">
          <Link href="/admin/dashboard" passHref>
             <Button variant="outline" size="icon" className="h-7 w-7">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Geri</span>
             </Button>
          </Link>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
             Yeni Firma Oluştur
          </h1>
       </div>
      <Card>
        <CardHeader>
          <CardTitle>Firma Detayları</CardTitle>
          <CardDescription>
            Yeni bir müşteri firması oluşturmak için aşağıdaki bilgileri doldurun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
              <div className="grid gap-3">
                <Label htmlFor="name">Firma Adı</Label>
                <Input id="name" name="name" placeholder="Örn: Okibo GmbH" />
                {state.errors?.name && <p className="text-sm text-red-500">{state.errors.name[0]}</p>}
              </div>
              <div className="grid gap-3">
                <Label htmlFor="code">Firma Kodu</Label>
                <Input id="code" name="code" placeholder="Benzersiz bir kod, örn: OKIBO" />
                {state.errors?.code && <p className="text-sm text-red-500">{state.errors.code[0]}</p>}
              </div>
              <div className="grid gap-3 sm:col-span-2">
                <Label htmlFor="monthlyScanLimit">Aylık Tarama Limiti</Label>
                <Input id="monthlyScanLimit" name="monthlyScanLimit" type="number" defaultValue="100" className="w-full sm:max-w-[200px]" />
                 {state.errors?.monthlyScanLimit && <p className="text-sm text-red-500">{state.errors.monthlyScanLimit[0]}</p>}
              </div>
            </div>
            {state.message && !state.success && <p className="text-sm text-red-500 mt-4">{state.message}</p>}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" asChild>
                <Link href="/admin/dashboard">İptal</Link>
            </Button>
           <SubmitButton />
        </CardFooter>
      </Card>
    </form>
  );
}

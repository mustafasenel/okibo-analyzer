'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Package } from '@prisma/client';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createPackage, updatePackage, deletePackage, PackageInput } from '@/app/admin/(protected)/packages/actions';

const empty: PackageInput = { name: '', monthlyCredits: 100, isActive: true };

export function PackagesManager({ packages }: { packages: Package[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PackageInput>(empty);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openNew = () => { setEditingId(null); setForm(empty); setError(''); setDialogOpen(true); };
  const openEdit = (p: Package) => {
    setEditingId(p.id);
    setForm({ name: p.name, monthlyCredits: p.monthlyCredits, isActive: p.isActive });
    setError('');
    setDialogOpen(true);
  };

  const submit = () => {
    setError('');
    startTransition(async () => {
      const res = editingId ? await updatePackage(editingId, form) : await createPackage(form);
      if (res.success) { setDialogOpen(false); router.refresh(); }
      else setError(res.error || 'İşlem başarısız.');
    });
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      const res = await deletePackage(deleteId);
      if (!res.success) setError(res.error || 'Silinemedi.');
      setDeleteId(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Paketler</h1>
          <p className="text-sm text-muted-foreground">Aylık kredi paketleri (firmalara atanır)</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Yeni Paket</Button>
      </div>

      {error && !dialogOpen && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paket Adı</TableHead>
              <TableHead className="text-right">Aylık Kredi</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-[100px] text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Henüz paket eklenmemiş.</TableCell></TableRow>
            ) : packages.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-right">{p.monthlyCredits.toLocaleString('tr-TR')}</TableCell>
                <TableCell>{p.isActive ? <Badge>Aktif</Badge> : <Badge variant="secondary">Pasif</Badge>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Paketi Düzenle' : 'Yeni Paket'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Paket Adı</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Örn: Başlangıç" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="monthlyCredits">Aylık Kredi</Label>
              <Input id="monthlyCredits" type="number" min={0} value={form.monthlyCredits} onChange={(e) => setForm({ ...form, monthlyCredits: parseInt(e.target.value) || 0 })} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4" />
              Aktif
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={submit} disabled={isPending}>{isPending && <Loader2 className="h-4 w-4 animate-spin" />} Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Paketi sil</AlertDialogTitle>
            <AlertDialogDescription>Bu paketi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

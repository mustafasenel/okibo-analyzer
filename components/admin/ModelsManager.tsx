'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Model } from '@prisma/client';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createModel, updateModel, deleteModel, ModelInput } from '@/app/admin/(protected)/models/actions';

const empty: ModelInput = { openrouterId: '', displayName: '', creditMultiplier: 1, isActive: true, sortOrder: 0 };

export function ModelsManager({ models }: { models: Model[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModelInput>(empty);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openNew = () => { setEditingId(null); setForm(empty); setError(''); setDialogOpen(true); };
  const openEdit = (m: Model) => {
    setEditingId(m.id);
    setForm({ openrouterId: m.openrouterId, displayName: m.displayName, creditMultiplier: m.creditMultiplier, isActive: m.isActive, sortOrder: m.sortOrder });
    setError('');
    setDialogOpen(true);
  };

  const submit = () => {
    setError('');
    startTransition(async () => {
      const res = editingId ? await updateModel(editingId, form) : await createModel(form);
      if (res.success) { setDialogOpen(false); router.refresh(); }
      else setError(res.error || 'İşlem başarısız.');
    });
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      const res = await deleteModel(deleteId);
      if (!res.success) setError(res.error || 'Silinemedi.');
      setDeleteId(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Modeller</h1>
          <p className="text-sm text-muted-foreground">OpenRouter modelleri ve kullanıcıların gördüğü dostane adlar</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Yeni Model</Button>
      </div>

      {error && !dialogOpen && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Görünen Ad</TableHead>
              <TableHead>OpenRouter ID</TableHead>
              <TableHead className="text-right">Kredi Çarpanı</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-[100px] text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Henüz model eklenmemiş.</TableCell></TableRow>
            ) : models.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.displayName}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{m.openrouterId}</TableCell>
                <TableCell className="text-right">×{m.creditMultiplier}</TableCell>
                <TableCell>
                  {m.isActive ? <Badge>Aktif</Badge> : <Badge variant="secondary">Pasif</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => setDeleteId(m.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Modeli Düzenle' : 'Yeni Model'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="displayName">Görünen Ad (kullanıcının gördüğü)</Label>
              <Input id="displayName" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Örn: Standart" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="openrouterId">OpenRouter Model ID</Label>
              <Input id="openrouterId" value={form.openrouterId} onChange={(e) => setForm({ ...form, openrouterId: e.target.value })} placeholder="qwen/qwen3-vl-8b-instruct" className="font-mono text-sm" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="creditMultiplier">Kredi Çarpanı (1 tarama kaç kredi tüketir)</Label>
              <Input id="creditMultiplier" type="number" min={1} value={form.creditMultiplier} onChange={(e) => setForm({ ...form, creditMultiplier: parseInt(e.target.value) || 1 })} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4" />
              Aktif (kullanıcılara sunulabilir)
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={submit} disabled={isPending}>{isPending && <Loader2 className="h-4 w-4 animate-spin" />} Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modeli sil</AlertDialogTitle>
            <AlertDialogDescription>Bu modeli silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
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

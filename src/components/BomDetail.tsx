import { useState, useMemo, useRef } from 'react';
import { BomList, BomItem, useBomItems, useBomLists } from '@/hooks/useBom';
import { useComponents } from '@/hooks/useComponents';
import { CATEGORIES } from '@/data/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Download, Pencil, CheckCircle2, AlertTriangle, XCircle, ImagePlus, FileImage, X, ExternalLink } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { getSupabaseClient } from '@/lib/supabase-config';
import { toast } from 'sonner';

interface BomDetailProps {
  bom: BomList;
  onBack: () => void;
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function exportBomCsv(bom: BomList, items: BomItem[]) {
  const header = ['Bezeichnung', 'Kategorie', 'Typ', 'Wert', 'Bauform', 'Menge (Stückliste)', 'Referenz', 'Notiz'].map(escapeCsv).join(',');
  const rows = items.map(item => {
    const c = item.component;
    if (!c) return '';
    const cat = CATEGORIES.find(ct => ct.id === c.category);
    return [
      c.name, cat?.label || c.category, c.type, c.value || '', c.package,
      String(item.quantity), item.referenceDesignator || '', item.note || '',
    ].map(escapeCsv).join(',');
  }).filter(Boolean);
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${bom.name.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function BomDetail({ bom, onBack }: BomDetailProps) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { items, addItem, updateItem, removeItem } = useBomItems(bom.id);
  const { updateBomList } = useBomLists();
  const { components } = useComponents();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState('');
  const [qty, setQty] = useState('1');
  const [refDes, setRefDes] = useState('');
  const [note, setNote] = useState('');
  const [editItem, setEditItem] = useState<BomItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [schematicPreview, setSchematicPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSchematicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Nur Bilder (PNG, JPG, SVG, WebP) oder PDF erlaubt.');
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${bom.id}/schematic.${ext}`;
    // Remove old file if exists
    if (bom.schematicUrl) {
      const oldPath = bom.schematicUrl.split('/schematics/')[1];
      if (oldPath) await supabase.storage.from('schematics').remove([oldPath]);
    }
    const { error } = await supabase.storage.from('schematics').upload(path, file, { upsert: true });
    if (error) {
      toast.error('Upload fehlgeschlagen: ' + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('schematics').getPublicUrl(path);
    await updateBomList(bom.id, { schematicUrl: urlData.publicUrl });
    toast.success('Schaltplan hochgeladen');
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveSchematic = async () => {
    if (bom.schematicUrl) {
      const oldPath = bom.schematicUrl.split('/schematics/')[1];
      if (oldPath) await supabase.storage.from('schematics').remove([oldPath]);
    }
    await updateBomList(bom.id, { schematicUrl: null });
    toast.success('Schaltplan entfernt');
  };

  const availableComponents = components.filter(
    c => !items.some(i => i.componentId === c.id)
  );

  const handleAddItem = async () => {
    if (!selectedComponentId) return;
    await addItem(selectedComponentId, parseInt(qty) || 1, refDes.trim() || undefined, note.trim() || undefined);
    setAddDialogOpen(false);
    setSelectedComponentId('');
    setQty('1');
    setRefDes('');
    setNote('');
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    await updateItem(editItem.id, {
      quantity: parseInt(qty) || 1,
      referenceDesignator: refDes.trim() || undefined,
      note: note.trim() || undefined,
    });
    setEditItem(null);
  };

  const openEdit = (item: BomItem) => {
    setEditItem(item);
    setQty(String(item.quantity));
    setRefDes(item.referenceDesignator || '');
    setNote(item.note || '');
  };

  // Stock check summary
  const stockStatus = useMemo(() => {
    let ok = 0, low = 0, missing = 0;
    items.forEach(item => {
      const c = item.component;
      if (!c) { missing++; return; }
      if (c.quantity >= item.quantity) ok++;
      else if (c.quantity > 0) low++;
      else missing++;
    });
    return { ok, low, missing, total: items.length };
  }, [items]);

  return (
    <div>
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 md:gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 md:h-9 md:w-9">
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="font-display text-base md:text-lg font-bold text-foreground truncate">{bom.name}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-display text-[10px] md:text-xs">{bom.version}</Badge>
              {bom.description && <p className="text-xs md:text-sm text-muted-foreground truncate">{bom.description}</p>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pl-10 sm:pl-0">
          {bom.schematicUrl ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setSchematicPreview(true)} className="gap-1.5">
                <FileImage className="h-4 w-4" />
                <span className="hidden sm:inline">Schaltplan</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleRemoveSchematic} className="gap-1.5 text-destructive hover:text-destructive">
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1.5">
              <ImagePlus className="h-4 w-4" />
              <span className="hidden sm:inline">{uploading ? 'Lädt...' : 'Schaltplan'}</span>
            </Button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleSchematicUpload} />
          <Button variant="outline" size="sm" onClick={() => exportBomCsv(bom, items)} className="gap-1.5">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Bauteil hinzufügen</span>
            <span className="sm:hidden">Hinzufügen</span>
          </Button>
        </div>
      </div>

      {/* Stock check summary */}
      {items.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm">
            <span className="font-display font-semibold text-foreground">{stockStatus.total}</span>
            <span className="text-muted-foreground">Positionen</span>
          </div>
          {stockStatus.ok > 0 && (
            <div className="flex items-center gap-1.5 rounded-md bg-[hsl(var(--success))/0.1] px-3 py-1.5 text-sm text-[hsl(var(--success))]">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-display font-medium">{stockStatus.ok} verfügbar</span>
            </div>
          )}
          {stockStatus.low > 0 && (
            <div className="flex items-center gap-1.5 rounded-md bg-[hsl(var(--warning))/0.1] px-3 py-1.5 text-sm text-[hsl(var(--warning))]">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-display font-medium">{stockStatus.low} teilweise</span>
            </div>
          )}
          {stockStatus.missing > 0 && (
            <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
              <XCircle className="h-4 w-4" />
              <span className="font-display font-medium">{stockStatus.missing} fehlen</span>
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="font-display text-muted-foreground">Keine Bauteile in dieser Stückliste</p>
          <p className="mt-1 text-sm text-muted-foreground">Füge Bauteile aus deinem Bestand hinzu.</p>
        </div>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="flex flex-col gap-2 md:hidden">
            {items.map(item => {
              const c = item.component;
              const cat = c ? CATEGORIES.find(ct => ct.id === c.category) : null;
              const stock = c?.quantity ?? 0;
              const needed = item.quantity;
              const isOk = stock >= needed;
              const isPartial = !isOk && stock > 0;
              const isMissing = stock === 0;
              return (
                <div key={item.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm text-foreground">{c?.name || '–'}</span>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <Badge variant="secondary" className="font-display text-[10px]">{cat?.label || c?.category || '–'}</Badge>
                        {c?.package && <Badge variant="outline" className="font-display text-[10px]">{c.package}</Badge>}
                        {item.referenceDesignator && <span className="text-[10px] text-muted-foreground">Ref: {item.referenceDesignator}</span>}
                      </div>
                      {item.note && <p className="text-[10px] text-muted-foreground mt-1">{item.note}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display text-xs text-muted-foreground">×{needed}</span>
                        <span className={`font-display text-sm font-bold ${isMissing ? 'text-destructive' : isPartial ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--success))]'}`}>
                          {stock}
                        </span>
                      </div>
                      {isOk ? (
                        <div className="flex items-center gap-0.5 text-[hsl(var(--success))]">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="text-[10px] font-medium">OK</span>
                        </div>
                      ) : isPartial ? (
                        <div className="flex items-center gap-0.5 text-[hsl(var(--warning))]">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="text-[10px] font-medium">−{needed - stock}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5 text-destructive">
                          <XCircle className="h-3 w-3" />
                          <span className="text-[10px] font-medium">Fehlt</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 mt-2 border-t border-border pt-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteItemId(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-display">Bezeichnung</TableHead>
                  <TableHead className="font-display">Kategorie</TableHead>
                  <TableHead className="font-display">Bauform</TableHead>
                  <TableHead className="font-display text-right">Benötigt</TableHead>
                  <TableHead className="font-display text-right">Bestand</TableHead>
                  <TableHead className="font-display">Status</TableHead>
                  <TableHead className="font-display">Referenz</TableHead>
                  <TableHead className="font-display">Notiz</TableHead>
                  <TableHead className="font-display text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => {
                  const c = item.component;
                  const cat = c ? CATEGORIES.find(ct => ct.id === c.category) : null;
                  const stock = c?.quantity ?? 0;
                  const needed = item.quantity;
                  const isOk = stock >= needed;
                  const isPartial = !isOk && stock > 0;
                  const isMissing = stock === 0;
                  return (
                    <TableRow key={item.id} className="group">
                      <TableCell className="font-medium">{c?.name || '–'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-display text-xs">
                          {cat?.label || c?.category || '–'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-display text-xs">{c?.package || '–'}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-display font-semibold">{needed}</TableCell>
                      <TableCell className={`text-right font-display font-semibold ${isMissing ? 'text-destructive' : isPartial ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--success))]'}`}>
                        {stock}
                      </TableCell>
                      <TableCell>
                        {isOk ? (
                          <div className="flex items-center gap-1 text-[hsl(var(--success))]">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-medium">OK</span>
                          </div>
                        ) : isPartial ? (
                          <div className="flex items-center gap-1 text-[hsl(var(--warning))]">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs font-medium">−{needed - stock}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-destructive">
                            <XCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Fehlt</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.referenceDesignator || '–'}</TableCell>
                      <TableCell className="text-muted-foreground">{item.note || '–'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteItemId(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Add item dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-primary">Bauteil hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bauteil *</label>
              <Select value={selectedComponentId} onValueChange={setSelectedComponentId}>
                <SelectTrigger><SelectValue placeholder="Bauteil wählen" /></SelectTrigger>
                <SelectContent>
                  {availableComponents.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.value ? `(${c.value})` : ''} – {c.package}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Menge</label>
                <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Referenz</label>
                <Input value={refDes} onChange={e => setRefDes(e.target.value)} placeholder="z.B. R1, C3" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notiz</label>
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleAddItem} disabled={!selectedComponentId}>Hinzufügen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit item dialog */}
      <Dialog open={!!editItem} onOpenChange={open => { if (!open) setEditItem(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-primary">Position bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Menge</label>
                <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Referenz</label>
                <Input value={refDes} onChange={e => setRefDes(e.target.value)} placeholder="z.B. R1, C3" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notiz</label>
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Abbrechen</Button>
            <Button onClick={handleEditSave}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteItemId}
        onOpenChange={open => { if (!open) setDeleteItemId(null); }}
        onConfirm={() => { if (deleteItemId) { removeItem(deleteItemId); setDeleteItemId(null); } }}
        title="Position entfernen?"
        description="Das Bauteil wird aus dieser Stückliste entfernt."
      />

      {/* Schematic preview dialog */}
      <Dialog open={schematicPreview} onOpenChange={setSchematicPreview}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-primary flex items-center gap-2">
              <FileImage className="h-5 w-5" />
              Schaltplan – {bom.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {bom.schematicUrl?.endsWith('.pdf') ? (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground">PDF-Schaltplan</p>
                <a href={bom.schematicUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-1.5">
                    <ExternalLink className="h-4 w-4" />
                    PDF öffnen
                  </Button>
                </a>
              </div>
            ) : (
              <img
                src={bom.schematicUrl}
                alt="Schaltplan"
                className="w-full rounded-lg border border-border object-contain max-h-[70vh]"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

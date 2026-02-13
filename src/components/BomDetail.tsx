import { useState } from 'react';
import { BomList, BomItem, useBomItems } from '@/hooks/useBom';
import { useComponents } from '@/hooks/useComponents';
import { CATEGORIES } from '@/data/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Download, Pencil } from 'lucide-react';

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
  const { items, addItem, updateItem, removeItem } = useBomItems(bom.id);
  const { components } = useComponents();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState('');
  const [qty, setQty] = useState('1');
  const [refDes, setRefDes] = useState('');
  const [note, setNote] = useState('');
  const [editItem, setEditItem] = useState<BomItem | null>(null);

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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">{bom.name}</h2>
            {bom.description && <p className="text-sm text-muted-foreground">{bom.description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportBomCsv(bom, items)} className="gap-1.5">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Bauteil hinzufügen
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="font-display text-muted-foreground">Keine Bauteile in dieser Stückliste</p>
          <p className="mt-1 text-sm text-muted-foreground">Füge Bauteile aus deinem Bestand hinzu.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-display">Bezeichnung</TableHead>
                <TableHead className="font-display">Kategorie</TableHead>
                <TableHead className="font-display">Bauform</TableHead>
                <TableHead className="font-display text-right">Menge</TableHead>
                <TableHead className="font-display">Referenz</TableHead>
                <TableHead className="font-display">Notiz</TableHead>
                <TableHead className="font-display text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => {
                const c = item.component;
                const cat = c ? CATEGORIES.find(ct => ct.id === c.category) : null;
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
                    <TableCell className="text-right font-display font-semibold">{item.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">{item.referenceDesignator || '–'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.note || '–'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.id)}>
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
    </div>
  );
}

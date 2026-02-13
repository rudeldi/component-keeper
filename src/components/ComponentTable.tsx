import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ElectronicComponent } from '@/types/component';
import { CATEGORIES } from '@/data/constants';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, ExternalLink, AlertTriangle, ClipboardList, Package, ShoppingCart } from 'lucide-react';
import { useBomLists, useBomItems } from '@/hooks/useBom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { StockManagementDialog } from '@/components/StockManagementDialog';

interface ComponentTableProps {
  components: ElectronicComponent[];
  onEdit: (component: ElectronicComponent) => void;
  onDelete: (id: string) => void;
}

function AddToBomDialog({ component, open, onOpenChange }: {
  component: ElectronicComponent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { bomLists } = useBomLists();
  const [selectedBomId, setSelectedBomId] = useState('');
  const [qty, setQty] = useState('1');
  const [refDes, setRefDes] = useState('');
  const { addItem } = useBomItems(selectedBomId || null);

  const handleAdd = async () => {
    if (!selectedBomId || !component) return;
    await addItem(component.id, parseInt(qty) || 1, refDes.trim() || undefined);
    toast({ title: 'Hinzugefügt', description: `${component.name} zur Stückliste hinzugefügt.` });
    onOpenChange(false);
    setSelectedBomId('');
    setQty('1');
    setRefDes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-primary">Zur Stückliste hinzufügen</DialogTitle>
        </DialogHeader>
        {component && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{component.name}</span>
              {component.value && ` (${component.value})`}
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Stückliste *</label>
              <Select value={selectedBomId} onValueChange={setSelectedBomId}>
                <SelectTrigger><SelectValue placeholder="Stückliste wählen" /></SelectTrigger>
                <SelectContent>
                  {bomLists.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {bomLists.length === 0 && (
                <p className="text-xs text-muted-foreground">Noch keine Stücklisten vorhanden. Erstelle zuerst eine unter "Stücklisten".</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Menge</label>
                <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Referenz</label>
                <Input value={refDes} onChange={e => setRefDes(e.target.value)} placeholder="z.B. R1" />
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleAdd} disabled={!selectedBomId}>Hinzufügen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ComponentTable({ components, onEdit, onDelete }: ComponentTableProps) {
  const [bomTarget, setBomTarget] = useState<ElectronicComponent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ElectronicComponent | null>(null);
  const [stockTarget, setStockTarget] = useState<ElectronicComponent | null>(null);

  // Fetch stock locations summary for all visible components
  const [stockSummary, setStockSummary] = useState<Record<string, { count: number; locations: string[] }>>({});

  useEffect(() => {
    if (components.length === 0) return;
    const ids = components.map(c => c.id);
    supabase
      .from('stock_locations')
      .select('component_id, location, quantity')
      .in('component_id', ids)
      .then(({ data }) => {
        if (!data) return;
        const summary: Record<string, { count: number; locations: string[] }> = {};
        for (const row of data as { component_id: string; location: string; quantity: number }[]) {
          if (!summary[row.component_id]) summary[row.component_id] = { count: 0, locations: [] };
          summary[row.component_id].count++;
          if (row.location) summary[row.component_id].locations.push(`${row.location} (${row.quantity})`);
        }
        setStockSummary(summary);
      });
  }, [components]);

  // Realtime refresh for stock_locations changes
  useEffect(() => {
    const channel = supabase
      .channel('stock-locations-summary')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_locations' }, () => {
        if (components.length === 0) return;
        const ids = components.map(c => c.id);
        supabase
          .from('stock_locations')
          .select('component_id, location, quantity')
          .in('component_id', ids)
          .then(({ data }) => {
            if (!data) return;
            const summary: Record<string, { count: number; locations: string[] }> = {};
            for (const row of data as { component_id: string; location: string; quantity: number }[]) {
              if (!summary[row.component_id]) summary[row.component_id] = { count: 0, locations: [] };
              summary[row.component_id].count++;
              if (row.location) summary[row.component_id].locations.push(`${row.location} (${row.quantity})`);
            }
            setStockSummary(summary);
          });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [components]);

  if (components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <p className="font-display text-muted-foreground">Keine Bauteile gefunden</p>
        <p className="mt-1 text-sm text-muted-foreground">Lege dein erstes Bauteil an.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile card layout */}
      <div className="flex flex-col gap-2 md:hidden">
        {components.map(comp => {
          const cat = CATEGORIES.find(c => c.id === comp.category);
          const isLow = comp.minQuantity != null && comp.quantity <= comp.minQuantity;
          return (
            <div key={comp.id} className="rounded-lg border border-border bg-card p-3" onClick={() => onEdit(comp)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">{comp.name}</span>
                    {comp.datasheetUrl && (
                      <a href={comp.datasheetUrl} target="_blank" rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary shrink-0"
                        onClick={e => e.stopPropagation()}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {comp.purchaseUrl && (
                      <a href={comp.purchaseUrl} target="_blank" rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary shrink-0"
                        onClick={e => e.stopPropagation()}>
                        <ShoppingCart className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <Badge variant="secondary" className="font-display text-[10px]">
                      {cat?.label || comp.category}
                    </Badge>
                    {comp.value && <span className="font-display text-xs text-accent-foreground">{comp.value}</span>}
                    {comp.package && <Badge variant="outline" className="font-display text-[10px]">{comp.package}</Badge>}
                    {stockSummary[comp.id] ? (
                      <span className="text-[10px] text-muted-foreground">📍 {stockSummary[comp.id].count} {stockSummary[comp.id].count === 1 ? 'Ort' : 'Orte'}</span>
                    ) : comp.location ? (
                      <span className="text-[10px] text-muted-foreground">📍 {comp.location}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`font-display text-lg font-bold ${isLow ? 'text-destructive' : 'text-foreground'}`}>
                    {comp.quantity}
                  </span>
                  {stockSummary[comp.id] && stockSummary[comp.id].count > 0 && (
                    <span className="text-[10px] text-muted-foreground font-display">{stockSummary[comp.id].count} Gebinde</span>
                  )}
                  {isLow && (
                    <span className="flex items-center gap-0.5 text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-[10px] font-medium">Niedrig</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-1 mt-2 border-t border-border pt-2">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); setStockTarget(comp); }}>
                  <Package className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); setBomTarget(comp); }}>
                  <ClipboardList className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); onEdit(comp); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={e => { e.stopPropagation(); setDeleteTarget(comp); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-display">Bezeichnung</TableHead>
              <TableHead className="font-display">Kategorie</TableHead>
              <TableHead className="font-display">Typ</TableHead>
              <TableHead className="font-display">Wert</TableHead>
              <TableHead className="font-display">Bauform</TableHead>
              <TableHead className="font-display text-right">Menge</TableHead>
              <TableHead className="font-display">Lagerort</TableHead>
              <TableHead className="font-display text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.map(comp => {
              const cat = CATEGORIES.find(c => c.id === comp.category);
              const isLow = comp.minQuantity != null && comp.quantity <= comp.minQuantity;
              return (
                <TableRow key={comp.id} className="group">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {comp.name}
                      {comp.datasheetUrl && (
                        <a href={comp.datasheetUrl} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {comp.purchaseUrl && (
                        <a href={comp.purchaseUrl} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary">
                          <ShoppingCart className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-display text-xs">
                      {cat?.label || comp.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{comp.type || '–'}</TableCell>
                  <TableCell className="font-display text-accent-foreground">{comp.value || '–'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-display text-xs">{comp.package || '–'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={`font-display font-semibold ${isLow ? 'text-destructive' : 'text-foreground'}`}>
                        {comp.quantity}
                      </span>
                      {stockSummary[comp.id] && stockSummary[comp.id].count > 0 && (
                        <Badge variant="outline" className="font-display text-[10px] px-1.5">{stockSummary[comp.id].count}×</Badge>
                      )}
                      {isLow && <AlertTriangle className="inline h-3.5 w-3.5 text-destructive" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {stockSummary[comp.id] && stockSummary[comp.id].locations.length > 0
                      ? stockSummary[comp.id].locations.join(', ')
                      : comp.location || '–'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setStockTarget(comp)}>
                            <Package className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Bestandsverwaltung</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setBomTarget(comp)}>
                            <ClipboardList className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Zur Stückliste hinzufügen</TooltipContent>
                      </Tooltip>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(comp)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(comp)}>
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

      <AddToBomDialog
        component={bomTarget}
        open={!!bomTarget}
        onOpenChange={open => { if (!open) setBomTarget(null); }}
      />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => { if (deleteTarget) { onDelete(deleteTarget.id); setDeleteTarget(null); } }}
        title={`"${deleteTarget?.name}" löschen?`}
        description="Das Bauteil wird unwiderruflich gelöscht und aus allen Stücklisten entfernt."
      />
      <StockManagementDialog
        component={stockTarget}
        open={!!stockTarget}
        onOpenChange={open => { if (!open) setStockTarget(null); }}
      />
    </>
  );
}

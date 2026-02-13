import { useState } from 'react';
import { ElectronicComponent } from '@/types/component';
import { CATEGORIES } from '@/data/constants';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, ExternalLink, AlertTriangle, ClipboardList } from 'lucide-react';
import { useBomLists, useBomItems } from '@/hooks/useBom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';

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
      <div className="overflow-x-auto rounded-lg border border-border">
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
                    <span className={`font-display font-semibold ${isLow ? 'text-destructive' : 'text-foreground'}`}>
                      {comp.quantity}
                    </span>
                    {isLow && <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-destructive" />}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{comp.location || '–'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
                        onClick={() => onDelete(comp.id)}>
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
    </>
  );
}

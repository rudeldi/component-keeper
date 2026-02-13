import { ElectronicComponent } from '@/types/component';
import { CATEGORIES } from '@/data/constants';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';

interface ComponentTableProps {
  components: ElectronicComponent[];
  onEdit: (component: ElectronicComponent) => void;
  onDelete: (id: string) => void;
}

export function ComponentTable({ components, onEdit, onDelete }: ComponentTableProps) {
  if (components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <p className="font-display text-muted-foreground">Keine Bauteile gefunden</p>
        <p className="mt-1 text-sm text-muted-foreground">Lege dein erstes Bauteil an.</p>
      </div>
    );
  }

  return (
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
  );
}

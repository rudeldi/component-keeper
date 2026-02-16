import { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertTriangle, Check } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-config';

interface BomCsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedBom {
  name: string;
  items: { componentName: string; quantity: number; reference: string; note: string }[];
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

export function BomCsvImportDialog({ open, onOpenChange }: BomCsvImportDialogProps) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [parsed, setParsed] = useState<ParsedBom | null>(null);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    const bomName = file.name.replace(/\.csv$/i, '');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setErrors(['CSV enthält keine Daten.']); return; }

      const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes('bezeichnung') || h === 'name');
      const qtyIdx = headers.findIndex(h => h.includes('menge') || h === 'quantity');
      const refIdx = headers.findIndex(h => h.includes('referenz') || h.includes('reference'));
      const noteIdx = headers.findIndex(h => h.includes('notiz') || h === 'note');

      if (nameIdx === -1) { setErrors(['Spalte "Bezeichnung" nicht gefunden.']); return; }

      const items = [];
      const errs: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvLine(lines[i]);
        const componentName = cells[nameIdx];
        if (!componentName) { errs.push(`Zeile ${i + 1}: Bezeichnung fehlt.`); continue; }
        items.push({
          componentName,
          quantity: qtyIdx >= 0 ? (parseInt(cells[qtyIdx]) || 1) : 1,
          reference: refIdx >= 0 ? (cells[refIdx] || '') : '',
          note: noteIdx >= 0 ? (cells[noteIdx] || '') : '',
        });
      }
      setErrors(errs);
      setParsed({ name: bomName, items });
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsed || parsed.items.length === 0) return;
    setImporting(true);

    // Create BOM list
    const { data: bomData } = await supabase.from('bom_lists').insert({ name: parsed.name }).select().single();
    if (!bomData) { setImporting(false); setErrors(['Fehler beim Erstellen der Stückliste.']); return; }

    // Fetch all components to match by name
    const { data: allComponents } = await supabase.from('components').select('id, name');
    const componentMap = new Map((allComponents || []).map(c => [c.name.toLowerCase(), c.id]));

    const bomItems: any[] = [];
    const notFound: string[] = [];

    for (const item of parsed.items) {
      const compId = componentMap.get(item.componentName.toLowerCase());
      if (!compId) { notFound.push(item.componentName); continue; }
      bomItems.push({
        bom_id: bomData.id,
        component_id: compId,
        quantity: item.quantity,
        reference_designator: item.reference || null,
        note: item.note || null,
      });
    }

    if (bomItems.length > 0) {
      await supabase.from('bom_items').insert(bomItems);
    }

    const msgs = [];
    if (bomItems.length > 0) msgs.push(`${bomItems.length} Positionen importiert.`);
    if (notFound.length > 0) msgs.push(`${notFound.length} Bauteile nicht gefunden: ${notFound.join(', ')}`);

    setImporting(false);
    setErrors(msgs);
    setParsed(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) { setParsed(null); setFileName(''); setErrors([]); }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Stückliste importieren</DialogTitle>
        </DialogHeader>

        {!parsed ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); }}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">CSV-Datei hierher ziehen oder</p>
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>Datei auswählen</Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <p className="text-xs text-muted-foreground">
              Spalten: Bezeichnung, Menge (Stückliste), Referenz, Notiz
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{fileName}</span>
            </div>
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                Stückliste "{parsed.name}" mit {parsed.items.length} Position{parsed.items.length !== 1 ? 'en' : ''}.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {errors.length > 0 && (
          <Alert variant={errors.some(e => e.includes('nicht gefunden')) ? 'default' : 'destructive'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pl-4 text-xs">
                {errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Schließen</Button>
          {parsed && parsed.items.length > 0 && (
            <Button onClick={handleImport} disabled={importing} className="gap-2">
              <Upload className="h-4 w-4" />
              {importing ? 'Importiere...' : 'Importieren'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

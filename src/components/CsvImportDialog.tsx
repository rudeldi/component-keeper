import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseCsvImport, CsvImportResult } from '@/lib/csv';
import { Upload, FileText, AlertTriangle, Check } from 'lucide-react';
import { ElectronicComponent } from '@/types/component';

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (components: Omit<ElectronicComponent, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
}

export function CsvImportDialog({ open, onOpenChange, onImport }: CsvImportDialogProps) {
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setResult(parseCsvImport(text));
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirm = () => {
    if (result?.components.length) {
      onImport(result.components);
      onOpenChange(false);
      setResult(null);
      setFileName('');
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) { setResult(null); setFileName(''); }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">CSV Import</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              CSV-Datei hierher ziehen oder
            </p>
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              Datei auswählen
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <p className="text-xs text-muted-foreground">
              Spalten: Bezeichnung, Kategorie, Typ, Wert, Bauform, Menge, ...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{fileName}</span>
            </div>

            {result.components.length > 0 && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  {result.components.length} Bauteil{result.components.length !== 1 ? 'e' : ''} erkannt.
                </AlertDescription>
              </Alert>
            )}

            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc pl-4 text-xs">
                    {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Abbrechen</Button>
          {result && result.components.length > 0 && (
            <Button onClick={handleConfirm} className="gap-2">
              <Upload className="h-4 w-4" />
              {result.components.length} importieren
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

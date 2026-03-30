import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Keyboard, ScanBarcode, X, ExternalLink } from 'lucide-react';
import { ElectronicComponent } from '@/types/component';
import { CATEGORIES } from '@/data/constants';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  components: ElectronicComponent[];
  onEdit: (component: ElectronicComponent) => void;
}

export function BarcodeScanner({ open, onOpenChange, components, onEdit }: BarcodeScannerProps) {
  const [mode, setMode] = useState<'choose' | 'camera' | 'keyboard'>('choose');
  const [scannedCode, setScannedCode] = useState('');
  const [results, setResults] = useState<ElectronicComponent[]>([]);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const keyBuffer = useRef('');
  const keyTimer = useRef<ReturnType<typeof setTimeout>>();

  // Search components by barcode
  const searchBarcode = useCallback((code: string) => {
    setScannedCode(code);
    if (!code.trim()) { setResults([]); return; }
    const q = code.trim().toLowerCase();
    const found = components.filter(c =>
      c.barcode?.toLowerCase() === q ||
      c.barcode?.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q)
    );
    setResults(found);
  }, [components]);

  // Camera scanning
  const startCamera = useCallback(async () => {
    setMode('camera');
    setCameraError('');

    // Dynamic import to avoid SSR issues
    const { Html5Qrcode } = await import('html5-qrcode');

    // Wait for DOM element
    await new Promise(r => setTimeout(r, 100));

    if (!videoRef.current) return;

    const scanner = new Html5Qrcode('barcode-reader');
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 120 } },
        (decodedText) => {
          searchBarcode(decodedText);
          // Don't stop - let user keep scanning
        },
        () => { /* ignore errors during scanning */ }
      );
    } catch (err: any) {
      setCameraError(err?.message || 'Kamera konnte nicht gestartet werden.');
    }
  }, [searchBarcode]);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      try { scannerRef.current.clear(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
  }, []);

  // Hardware scanner keyboard listener
  useEffect(() => {
    if (!open || mode !== 'keyboard') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (keyBuffer.current.length > 0) {
          searchBarcode(keyBuffer.current);
          keyBuffer.current = '';
        }
        return;
      }

      if (e.key.length === 1) {
        keyBuffer.current += e.key;
        clearTimeout(keyTimer.current);
        keyTimer.current = setTimeout(() => {
          if (keyBuffer.current.length >= 3) {
            searchBarcode(keyBuffer.current);
          }
          keyBuffer.current = '';
        }, 200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(keyTimer.current);
    };
  }, [open, mode, searchBarcode]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      stopCamera();
      setMode('choose');
      setScannedCode('');
      setResults([]);
      setCameraError('');
      keyBuffer.current = '';
    }
  }, [open, stopCamera]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-primary">
            <ScanBarcode className="h-5 w-5" />
            Barcode Scanner
          </DialogTitle>
        </DialogHeader>

        {mode === 'choose' && (
          <div className="grid grid-cols-2 gap-3 py-4">
            <button
              onClick={startCamera}
              className="flex flex-col items-center gap-3 rounded-lg border border-border p-6 text-center transition-colors hover:border-primary/50 hover:bg-secondary"
            >
              <Camera className="h-8 w-8 text-primary" />
              <div>
                <p className="font-display text-sm font-semibold text-foreground">Kamera</p>
                <p className="text-xs text-muted-foreground">Barcode mit Kamera scannen</p>
              </div>
            </button>
            <button
              onClick={() => setMode('keyboard')}
              className="flex flex-col items-center gap-3 rounded-lg border border-border p-6 text-center transition-colors hover:border-primary/50 hover:bg-secondary"
            >
              <Keyboard className="h-8 w-8 text-primary" />
              <div>
                <p className="font-display text-sm font-semibold text-foreground">Handscanner</p>
                <p className="text-xs text-muted-foreground">USB/Bluetooth Scanner</p>
              </div>
            </button>
          </div>
        )}

        {mode === 'camera' && (
          <div className="space-y-3">
            <div
              id="barcode-reader"
              ref={videoRef}
              className="overflow-hidden rounded-lg border border-border"
              style={{ minHeight: 250 }}
            />
            {cameraError && (
              <p className="text-sm text-destructive">{cameraError}</p>
            )}
            <Button variant="outline" size="sm" onClick={() => { stopCamera(); setMode('choose'); }} className="gap-1.5">
              <X className="h-4 w-4" /> Zurück
            </Button>
          </div>
        )}

        {mode === 'keyboard' && (
          <div className="space-y-3 py-2">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
              <Keyboard className="h-10 w-10 text-primary animate-pulse" />
              <p className="text-sm text-muted-foreground">
                Scanne jetzt einen Barcode mit deinem Handscanner...
              </p>
              <p className="text-xs text-muted-foreground">
                Der Scanner sendet die Daten automatisch als Tastatureingabe.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setMode('choose')} className="gap-1.5">
              <X className="h-4 w-4" /> Zurück
            </Button>
          </div>
        )}

        {/* Scanned result */}
        {scannedCode && (
          <div className="space-y-3 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Gescannt:</span>
              <Badge variant="outline" className="font-display text-xs">{scannedCode}</Badge>
            </div>

            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">Kein Bauteil mit diesem Barcode gefunden.</p>
            ) : (
              <div className="space-y-2">
                {results.map(comp => {
                  const cat = CATEGORIES.find(c => c.id === comp.category);
                  return (
                    <button
                      key={comp.id}
                      onClick={() => { onEdit(comp); onOpenChange(false); }}
                      className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/50 hover:bg-secondary"
                    >
                      <div>
                        <p className="font-medium text-foreground">{comp.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="secondary" className="font-display text-xs">
                            {cat?.label || comp.category}
                          </Badge>
                          {comp.value && (
                            <span className="text-xs text-accent-foreground">{comp.value}</span>
                          )}
                          <Badge variant="outline" className="font-display text-xs">{comp.package}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-lg font-bold text-foreground">{comp.quantity}</span>
                        <p className="text-xs text-muted-foreground">auf Lager</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Camera, Keyboard, ScanBarcode, X, ExternalLink, Search } from 'lucide-react';
import { ElectronicComponent } from '@/types/component';
import { CATEGORIES } from '@/data/constants';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  components: ElectronicComponent[];
  onEdit: (component: ElectronicComponent) => void;
}

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function BarcodeScanner({ open, onOpenChange, components, onEdit }: BarcodeScannerProps) {
  // On mobile: start directly in camera mode
  const [mode, setMode] = useState<'choose' | 'camera' | 'keyboard' | 'manual'>('choose');
  const [scannedCode, setScannedCode] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [results, setResults] = useState<ElectronicComponent[]>([]);
  const [cameraError, setCameraError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const keyBuffer = useRef('');
  const keyTimer = useRef<ReturnType<typeof setTimeout>>();

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

  const stopCamera = useCallback(async () => {
    setCameraReady(false);
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      try { scannerRef.current.clear(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setMode('camera');
    setCameraError('');
    setCameraReady(false);

    const { Html5Qrcode } = await import('html5-qrcode');
    await new Promise(r => setTimeout(r, 150));
    if (!videoRef.current) return;

    const scanner = new Html5Qrcode('barcode-reader');
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: (w: number, h: number) => ({
            width: Math.min(w * 0.8, 280),
            height: Math.min(h * 0.4, 120),
          }),
        },
        (decodedText: string) => {
          searchBarcode(decodedText);
        },
        () => { /* ignore scan errors */ }
      );
      setCameraReady(true);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setCameraError('Kamera-Zugriff verweigert. Bitte erlaube den Kamerazugriff in den Browser-Einstellungen.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setCameraError('Keine Kamera gefunden. Bitte manuell suchen.');
      } else {
        setCameraError('Kamera konnte nicht gestartet werden: ' + msg);
      }
    }
  }, [searchBarcode]);

  // Auto-start camera on mobile when dialog opens
  useEffect(() => {
    if (open && isMobile()) {
      startCamera();
    } else if (open) {
      setMode('choose');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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
          if (keyBuffer.current.length >= 3) searchBarcode(keyBuffer.current);
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
      setManualInput('');
      setResults([]);
      setCameraError('');
      keyBuffer.current = '';
    }
  }, [open, stopCamera]);

  const ResultList = () => (
    <>
      {scannedCode && (
        <div className="space-y-3 border-t border-border pt-3 mt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Gescannt:</span>
            <Badge variant="outline" className="font-display text-xs">{scannedCode}</Badge>
            <button onClick={() => { setScannedCode(''); setResults([]); }}
              className="ml-auto text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">Kein Bauteil mit diesem Barcode gefunden.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {results.map(comp => {
                const cat = CATEGORIES.find(c => c.id === comp.category);
                return (
                  <button
                    key={comp.id}
                    onClick={() => { onEdit(comp); onOpenChange(false); }}
                    className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/50 hover:bg-secondary"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{comp.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="font-display text-xs">
                          {cat?.label || comp.category}
                        </Badge>
                        {comp.value && <span className="text-xs text-accent-foreground">{comp.value}</span>}
                        <Badge variant="outline" className="font-display text-xs">{comp.package}</Badge>
                      </div>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <span className="font-display text-lg font-bold text-foreground">{comp.quantity}</span>
                      <p className="text-xs text-muted-foreground">Lager</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-h-[92vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="font-display flex items-center gap-2 text-primary">
            <ScanBarcode className="h-5 w-5" />
            Barcode Scanner
          </DialogTitle>
        </DialogHeader>

        {/* ── Auswahl-Modus (nur Desktop) ── */}
        {mode === 'choose' && (
          <div className="grid grid-cols-2 gap-3 py-2">
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
            <button
              onClick={() => setMode('manual')}
              className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-border p-4 text-center transition-colors hover:border-primary/50 hover:bg-secondary"
            >
              <Search className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-display text-sm font-semibold text-foreground">Manuell suchen</p>
                <p className="text-xs text-muted-foreground">Barcode oder Name eingeben</p>
              </div>
            </button>
          </div>
        )}

        {/* ── Kamera-Modus ── */}
        {mode === 'camera' && (
          <div className="space-y-3">
            {/* Kamerafenster — aspect-ratio für mobile */}
            <div
              id="barcode-reader"
              ref={videoRef}
              className="w-full overflow-hidden rounded-lg border border-border bg-black"
              style={{ aspectRatio: '4/3', minHeight: 200, maxHeight: '45vh' }}
            />

            {!cameraReady && !cameraError && (
              <p className="text-center text-xs text-muted-foreground animate-pulse">Kamera wird gestartet…</p>
            )}
            {cameraError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {cameraError}
              </div>
            )}

            {/* Manuelle Eingabe als Fallback direkt unter der Kamera */}
            <div className="flex gap-2">
              <Input
                placeholder="Barcode manuell eingeben…"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && manualInput.trim()) { searchBarcode(manualInput.trim()); setManualInput(''); } }}
                className="flex-1 h-10"
              />
              <Button size="sm" className="h-10 px-3" onClick={() => { if (manualInput.trim()) { searchBarcode(manualInput.trim()); setManualInput(''); } }}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={() => { stopCamera(); setMode(isMobile() ? 'manual' : 'choose'); }} className="gap-1.5 w-full">
              <X className="h-4 w-4" /> Kamera schließen
            </Button>

            <ResultList />
          </div>
        )}

        {/* ── Handscanner-Modus ── */}
        {mode === 'keyboard' && (
          <div className="space-y-3 py-2">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
              <Keyboard className="h-10 w-10 text-primary animate-pulse" />
              <p className="text-sm text-muted-foreground">Scanne jetzt einen Barcode mit deinem Handscanner…</p>
              <p className="text-xs text-muted-foreground">Der Scanner sendet die Daten automatisch als Tastatureingabe.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setMode('choose')} className="gap-1.5 w-full">
              <X className="h-4 w-4" /> Zurück
            </Button>
            <ResultList />
          </div>
        )}

        {/* ── Manuelle Suche (Mobile Fallback) ── */}
        {mode === 'manual' && (
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="Barcode oder Bauteilname…"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && manualInput.trim()) { searchBarcode(manualInput.trim()); setManualInput(''); } }}
                className="flex-1 h-11"
                autoFocus
              />
              <Button size="sm" className="h-11 px-3" onClick={() => { if (manualInput.trim()) { searchBarcode(manualInput.trim()); setManualInput(''); } }}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={startCamera} className="gap-1.5 w-full">
              <Camera className="h-4 w-4" /> Kamera versuchen
            </Button>
            <ResultList />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useBomLists, useBomItems } from '@/hooks/useBom';
import { getSupabaseClient } from '@/lib/supabase-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { CircuitBoard, Package, ClipboardList, Factory, AlertTriangle, CheckCircle2, History, Trash2, MapPin, BarChart3, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface StockLocationInfo {
  id: string;
  location: string;
  quantity: number;
}

interface ProductionRun {
  id: string;
  bom_id: string;
  bom_name: string;
  quantity: number;
  created_at: string;
}

const ProductionPage = () => {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { bomLists } = useBomLists();
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null);
  const { items, loading: itemsLoading } = useBomItems(selectedBomId);
  const [quantity, setQuantity] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [producing, setProducing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: string[] } | null>(null);
  const { toast } = useToast();

  // Stock locations per component: componentId -> StockLocationInfo[]
  const [componentLocations, setComponentLocations] = useState<Record<string, StockLocationInfo[]>>({});
  // Selected location per BOM item: itemId -> locationId (or "auto" for automatic)
  const [selectedLocations, setSelectedLocations] = useState<Record<string, string>>({});

  // Production history
  const [history, setHistory] = useState<ProductionRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!supabase) { setHistoryLoading(false); return; }
    const { data } = await supabase
      .from('production_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setHistory(data as ProductionRun[]);
    setHistoryLoading(false);
  }, [supabase]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Fetch stock locations for all components in the BOM
  useEffect(() => {
    if (items.length === 0 || !supabase) {
      setComponentLocations({});
      setSelectedLocations({});
      return;
    }
    const componentIds = [...new Set(items.map(i => i.componentId))];
    supabase
      .from('stock_locations')
      .select('id, component_id, location, quantity')
      .in('component_id', componentIds)
      .order('quantity', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, StockLocationInfo[]> = {};
        for (const loc of data) {
          const cid = (loc as any).component_id as string;
          if (!map[cid]) map[cid] = [];
          map[cid].push({ id: loc.id, location: loc.location, quantity: loc.quantity });
        }
        setComponentLocations(map);
        const defaults: Record<string, string> = {};
        items.forEach(item => { defaults[item.id] = 'auto'; });
        setSelectedLocations(defaults);
      });
  }, [items, supabase]);

  const selectedBom = bomLists.find(b => b.id === selectedBomId);

  // Check stock availability considering selected location
  const stockCheck = useMemo(() => items.map(item => {
    const needed = item.quantity * quantity;
    const locs = componentLocations[item.componentId] || [];
    const selectedLocId = selectedLocations[item.id] || 'auto';

    let available: number;
    if (selectedLocId === 'auto') {
      // Sum of all locations, or component quantity if no locations
      available = locs.length > 0 ? locs.reduce((s, l) => s + l.quantity, 0) : (item.component?.quantity ?? 0);
    } else {
      const loc = locs.find(l => l.id === selectedLocId);
      available = loc?.quantity ?? 0;
    }

    const sufficient = available >= needed;
    return { item, needed, available, sufficient, locs, selectedLocId };
  }), [items, quantity, componentLocations, selectedLocations]);

  const allSufficient = stockCheck.length > 0 && stockCheck.every(s => s.sufficient);
  const hasItems = items.length > 0;

  const handleProduce = useCallback(async () => {
    if (!selectedBomId || !hasItems) return;
    setProducing(true);
    const errors: string[] = [];
    const successes: string[] = [];
    const prodNote = `Produktion: ${selectedBom?.name} ${selectedBom?.version} ×${quantity}`;

    for (const { item, needed, available, sufficient, locs, selectedLocId } of stockCheck) {
      if (!item.component) {
        errors.push(`Bauteil ${item.componentId} nicht gefunden`);
        continue;
      }
      if (!sufficient) {
        errors.push(`${item.component.name}: Benötigt ${needed}, verfügbar ${available}`);
        continue;
      }

      if (selectedLocId !== 'auto') {
        // Deduct from a specific location
        const loc = locs.find(l => l.id === selectedLocId);
        if (!loc) { errors.push(`${item.component.name}: Lagerort nicht gefunden`); continue; }
        await supabase.from('stock_locations').update({ quantity: loc.quantity - needed }).eq('id', loc.id);
        await supabase.from('stock_movements').insert({
          component_id: item.componentId,
          stock_location_id: loc.id,
          quantity_change: -needed,
          movement_type: 'out',
          note: prodNote,
        });
        successes.push(`${item.component.name}: −${needed} (${loc.location})`);
      } else if (locs.length > 0) {
        // Auto: deduct from largest first
        let remaining = needed;
        const parts: string[] = [];
        for (const loc of locs) {
          if (remaining <= 0) break;
          const deduct = Math.min(loc.quantity, remaining);
          await supabase.from('stock_locations').update({ quantity: loc.quantity - deduct }).eq('id', loc.id);
          await supabase.from('stock_movements').insert({
            component_id: item.componentId,
            stock_location_id: loc.id,
            quantity_change: -deduct,
            movement_type: 'out',
            note: prodNote,
          });
          remaining -= deduct;
          parts.push(`${loc.location} −${deduct}`);
        }
        successes.push(`${item.component.name}: ${parts.join(', ')}`);
      } else {
        // No locations, deduct from component directly
        await supabase.from('components').update({ quantity: available - needed }).eq('id', item.componentId);
        await supabase.from('stock_movements').insert({
          component_id: item.componentId,
          quantity_change: -needed,
          movement_type: 'out',
          note: prodNote,
        });
        successes.push(`${item.component.name}: −${needed}`);
      }
    }

    setProducing(false);
    setConfirmOpen(false);

    if (errors.length > 0) {
      setResult({ success: false, message: `Produktion teilweise fehlgeschlagen (${errors.length} Fehler)`, details: [...errors, ...successes] });
    } else {
      await supabase.from('production_runs').insert({
        bom_id: selectedBomId,
        bom_name: `${selectedBom?.name} (${selectedBom?.version})`,
        quantity,
      });
      await fetchHistory();
      setResult({ success: true, message: `${quantity}× ${selectedBom?.name} ${selectedBom?.version} erfolgreich produziert!`, details: successes });
      toast({ title: 'Produktion erfolgreich', description: `${quantity}× ${selectedBom?.name} produziert. Bestände aktualisiert.` });
    }
  }, [selectedBomId, hasItems, stockCheck, quantity, selectedBom, toast, fetchHistory]);

  return (
    <div className="min-h-screen pcb-grid pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between py-3 md:py-4">
          <div className="flex items-center gap-2 md:gap-3">
            <CircuitBoard className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            <h1 className="font-display text-base md:text-xl font-bold tracking-tight text-foreground">
              Bauteil<span className="text-primary">Verwaltung</span>
            </h1>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <Package className="h-4 w-4" /> Bauteile
            </Link>
            <Link to="/bom" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ClipboardList className="h-4 w-4" /> Stücklisten
            </Link>
            <Link to="/production" className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
              <Factory className="h-4 w-4 text-primary" /> Produktion
            </Link>
            <Link to="/stats" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <BarChart3 className="h-4 w-4" /> Statistik
            </Link>
            <Link to="/settings" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <Settings className="h-4 w-4" /> Einstellungen
            </Link>
          </nav>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-border bg-background/95 backdrop-blur-md">
        <Link to="/" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-muted-foreground">
          <Package className="h-5 w-5" />
          <span className="font-display text-[10px] font-medium">Bauteile</span>
        </Link>
        <Link to="/bom" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-muted-foreground">
          <ClipboardList className="h-5 w-5" />
          <span className="font-display text-[10px] font-medium">Stücklisten</span>
        </Link>
        <Link to="/production" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-primary">
          <Factory className="h-5 w-5" />
          <span className="font-display text-[10px] font-medium">Produktion</span>
        </Link>
        <Link to="/stats" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-muted-foreground">
          <BarChart3 className="h-5 w-5" />
          <span className="font-display text-[10px] font-medium">Statistik</span>
        </Link>
        <Link to="/settings" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-muted-foreground">
          <Settings className="h-5 w-5" />
          <span className="font-display text-[10px] font-medium">Einstellungen</span>
        </Link>
      </nav>

      <main className="container py-4 md:py-8 max-w-4xl">
        <h2 className="font-display text-base md:text-lg font-semibold text-foreground flex items-center gap-2 mb-6">
          <Factory className="h-5 w-5 text-primary" />
          Produktion / Bestückung
        </h2>

        <div className="space-y-6">
          {/* Step 1: Select BOM */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Stückliste auswählen</label>
            <Select value={selectedBomId ?? ''} onValueChange={v => { setSelectedBomId(v || null); setResult(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Stückliste wählen..." />
              </SelectTrigger>
              <SelectContent>
                {bomLists.map(bom => (
                  <SelectItem key={bom.id} value={bom.id}>
                    {bom.name} ({bom.version})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Quantity */}
          {selectedBomId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Anzahl Platinen</label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={e => { setQuantity(Math.max(1, parseInt(e.target.value) || 1)); setResult(null); }}
                className="max-w-32"
              />
            </div>
          )}

          {/* Step 3: Stock check table with location selection */}
          {selectedBomId && !itemsLoading && hasItems && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Bestandsprüfung ({quantity}× {selectedBom?.name})</h3>
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-display text-xs">Bauteil</TableHead>
                      <TableHead className="font-display text-xs">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Lagerort</span>
                      </TableHead>
                      <TableHead className="font-display text-xs text-right">Benötigt</TableHead>
                      <TableHead className="font-display text-xs text-right">Verfügbar</TableHead>
                      <TableHead className="font-display text-xs text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockCheck.map(({ item, needed, available, sufficient, locs, selectedLocId }) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">
                          <div>
                            <span className="font-medium">{item.component?.name ?? '–'}</span>
                            {item.component?.value && (
                              <span className="ml-1.5 text-muted-foreground">{item.component.value}</span>
                            )}
                          </div>
                          {item.referenceDesignator && (
                            <span className="text-xs text-muted-foreground">{item.referenceDesignator}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {locs.length > 0 ? (
                            <Select
                              value={selectedLocId}
                              onValueChange={v => setSelectedLocations(prev => ({ ...prev, [item.id]: v }))}
                            >
                              <SelectTrigger className="h-8 text-xs w-full min-w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="auto">
                                  Automatisch ({locs.reduce((s, l) => s + l.quantity, 0)})
                                </SelectItem>
                                {locs.map(loc => (
                                  <SelectItem key={loc.id} value={loc.id}>
                                    {loc.location} ({loc.quantity})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">–</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-right font-mono">{needed}</TableCell>
                        <TableCell className="text-sm text-right font-mono">{available}</TableCell>
                        <TableCell className="text-center">
                          {sufficient ? (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> OK
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" /> −{needed - available}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {!allSufficient && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Nicht genügend Bestand für alle Bauteile vorhanden.
                </div>
              )}

              <Button onClick={() => setConfirmOpen(true)} disabled={!allSufficient} className="gap-2">
                <Factory className="h-4 w-4" />
                {quantity}× produzieren
              </Button>
            </div>
          )}

          {selectedBomId && !itemsLoading && !hasItems && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
              <ClipboardList className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Diese Stückliste enthält keine Positionen.</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`rounded-lg border p-4 ${result.success ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.success ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
                <span className={`font-medium text-sm ${result.success ? 'text-primary' : 'text-destructive'}`}>{result.message}</span>
              </div>
              {result.details && (
                <ul className="space-y-0.5 text-xs text-muted-foreground ml-7">
                  {result.details.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Production History */}
        <div className="mt-10 space-y-3">
          <h3 className="font-display text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Produktionshistorie
          </h3>
          {history.length === 0 && !historyLoading ? (
            <p className="text-sm text-muted-foreground">Noch keine Produktionsläufe vorhanden.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-display text-xs">Datum</TableHead>
                    <TableHead className="font-display text-xs">Stückliste</TableHead>
                    <TableHead className="font-display text-xs text-right">Menge</TableHead>
                    <TableHead className="font-display text-xs text-right w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map(run => (
                    <TableRow key={run.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(run.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{run.bom_name}</TableCell>
                      <TableCell className="text-sm text-right font-mono">{run.quantity}×</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            await supabase.from('production_runs').delete().eq('id', run.id);
                            fetchHistory();
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="font-display text-primary">Produktion bestätigen</DialogTitle>
            <DialogDescription>
              {quantity}× <strong>{selectedBom?.name}</strong> ({selectedBom?.version}) produzieren?
              Die benötigten Bauteile werden vom Bestand abgezogen.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Folgende Mengen werden abgebucht:</p>
            <ul className="space-y-0.5 text-xs max-h-48 overflow-y-auto">
              {stockCheck.map(({ item, needed, locs, selectedLocId }) => {
                const locLabel = selectedLocId !== 'auto'
                  ? locs.find(l => l.id === selectedLocId)?.location
                  : 'Automatisch';
                return (
                  <li key={item.id}>
                    {item.component?.name}: <span className="font-mono">−{needed}</span>
                    <span className="text-muted-foreground/70 ml-1">({locLabel})</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={producing}>Abbrechen</Button>
            <Button onClick={handleProduce} disabled={producing} className="gap-2">
              {producing ? 'Wird produziert...' : 'Produzieren'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductionPage;

import { useState } from 'react';
import { ElectronicComponent } from '@/types/component';
import { useStockLocations } from '@/hooks/useStockLocations';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Minus, Trash2, MapPin, History, Package } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface StockManagementDialogProps {
  component: ElectronicComponent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockManagementDialog({ component, open, onOpenChange }: StockManagementDialogProps) {
  const { locations, movements, loading, addLocation, removeLocation, bookStock } = useStockLocations(component?.id ?? null);
  const [newLocation, setNewLocation] = useState('');
  const [newQty, setNewQty] = useState('0');
  const [bookAmounts, setBookAmounts] = useState<Record<string, string>>({});
  const [bookNotes, setBookNotes] = useState<Record<string, string>>({});

  const handleAddLocation = async () => {
    if (!newLocation.trim()) return;
    await addLocation(newLocation.trim(), parseInt(newQty) || 0);
    toast({ title: 'Lagerort hinzugefügt', description: `"${newLocation.trim()}" wurde angelegt.` });
    setNewLocation('');
    setNewQty('0');
  };

  const handleBook = async (locationId: string, direction: 'in' | 'out') => {
    const amount = parseInt(bookAmounts[locationId] || '1') || 1;
    const change = direction === 'in' ? amount : -amount;
    const note = bookNotes[locationId]?.trim() || undefined;
    await bookStock(locationId, change, note);
    toast({
      title: direction === 'in' ? 'Eingebucht' : 'Ausgebucht',
      description: `${amount} Stk. ${direction === 'in' ? 'hinzugefügt' : 'entnommen'}.`,
    });
    setBookAmounts(prev => ({ ...prev, [locationId]: '' }));
    setBookNotes(prev => ({ ...prev, [locationId]: '' }));
  };

  const totalQty = locations.reduce((s, l) => s + l.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="font-display text-primary flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bestandsverwaltung
          </DialogTitle>
          {component && (
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground">{component.name}</span>
              {component.value && ` · ${component.value}`}
              <Badge variant="secondary" className="ml-2 font-display">{totalQty} Stk. gesamt</Badge>
            </p>
          )}
        </DialogHeader>

        <Tabs defaultValue="locations" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="locations" className="flex-1 gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lagerorte</span>
              <span className="sm:hidden">Lager</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-1.5">
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Buchungen</span>
              <span className="sm:hidden">Historie</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="locations" className="space-y-4 mt-4">
            {/* Add new location */}
            <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Neuer Lagerort</Label>
              <div className="flex gap-2">
                <Input
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                  placeholder="z.B. Regal A3"
                  className="flex-1 h-9"
                />
                <Input
                  type="number"
                  min="0"
                  value={newQty}
                  onChange={e => setNewQty(e.target.value)}
                  className="w-20 h-9"
                  placeholder="Menge"
                />
                <Button size="sm" onClick={handleAddLocation} disabled={!newLocation.trim()} className="h-9">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Existing locations */}
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Laden...</p>
            ) : locations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Noch keine Lagerorte. Füge oben einen hinzu.
              </p>
            ) : (
              <div className="space-y-3">
                {locations.map(loc => (
                  <div key={loc.id} className="rounded-lg border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{loc.location || '(ohne Ort)'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg font-bold">{loc.quantity}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeLocation(loc.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {/* Booking controls */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={bookAmounts[loc.id] || ''}
                        onChange={e => setBookAmounts(prev => ({ ...prev, [loc.id]: e.target.value }))}
                        placeholder="Anzahl"
                        className="h-9 w-full sm:w-24"
                      />
                      <Input
                        value={bookNotes[loc.id] || ''}
                        onChange={e => setBookNotes(prev => ({ ...prev, [loc.id]: e.target.value }))}
                        placeholder="Notiz (optional)"
                        className="h-9 flex-1"
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="flex-1 sm:flex-none gap-1 h-9"
                          onClick={() => handleBook(loc.id, 'in')}>
                          <Plus className="h-3.5 w-3.5" /> Ein
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 sm:flex-none gap-1 h-9 text-destructive hover:text-destructive"
                          onClick={() => handleBook(loc.id, 'out')}>
                          <Minus className="h-3.5 w-3.5" /> Aus
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Noch keine Buchungen vorhanden.</p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {movements.map(m => {
                  const loc = locations.find(l => l.id === m.stock_location_id);
                  const isPositive = m.quantity_change > 0;
                  return (
                    <div key={m.id} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm border border-border">
                      <Badge variant={isPositive ? 'default' : 'destructive'} className="font-display text-xs shrink-0">
                        {isPositive ? '+' : ''}{m.quantity_change}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        {loc && <span className="text-muted-foreground text-xs">📍 {loc.location}</span>}
                        {m.note && <p className="text-xs text-foreground truncate">{m.note}</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(m.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

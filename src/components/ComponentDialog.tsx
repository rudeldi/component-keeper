import { useState } from 'react';
import { ElectronicComponent, ComponentCategory } from '@/types/component';
import { CATEGORIES, ALL_PACKAGES, COMPONENT_TYPES } from '@/data/constants';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface ComponentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<ElectronicComponent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initial?: ElectronicComponent;
}

export function ComponentDialog({ open, onOpenChange, onSave, initial }: ComponentDialogProps) {
  const [category, setCategory] = useState<ComponentCategory>(initial?.category || 'resistors');
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState(initial?.type || '');
  const [value, setValue] = useState(initial?.value || '');
  const [pkg, setPkg] = useState(initial?.package || '');
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() || '0');
  const [minQuantity, setMinQuantity] = useState(initial?.minQuantity?.toString() || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [barcode, setBarcode] = useState(initial?.barcode || '');
  const [datasheetUrl, setDatasheetUrl] = useState(initial?.datasheetUrl || '');
  const [purchaseUrl, setPurchaseUrl] = useState(initial?.purchaseUrl || '');
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice?.toString() || '');
  const [manufacturer, setManufacturer] = useState(initial?.manufacturer || '');
  const [description, setDescription] = useState(initial?.description || '');

  const types = COMPONENT_TYPES[category] || [];

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      category,
      type,
      value: value.trim() || undefined,
      package: pkg,
      quantity: parseInt(quantity) || 0,
      minQuantity: minQuantity ? parseInt(minQuantity) : undefined,
      location: location.trim() || undefined,
      barcode: barcode.trim() || undefined,
      datasheetUrl: datasheetUrl.trim() || undefined,
      purchaseUrl: purchaseUrl.trim() || undefined,
      unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
      manufacturer: manufacturer.trim() || undefined,
      description: description.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="font-display text-primary">
            {initial ? 'Bauteil bearbeiten' : 'Neues Bauteil anlegen'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>Kategorie *</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v as ComponentCategory); setType(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue placeholder="Typ wählen" /></SelectTrigger>
                <SelectContent>
                  {types.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Bezeichnung *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. 10kΩ 1% 0603" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>Wert</Label>
              <Input value={value} onChange={e => setValue(e.target.value)} placeholder="z.B. 10kΩ, 100nF" />
            </div>
            <div className="space-y-2">
              <Label>Bauform</Label>
              <Select value={pkg} onValueChange={setPkg}>
                <SelectTrigger><SelectValue placeholder="Bauform wählen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__smd_header" disabled>── SMD ──</SelectItem>
                  {ALL_PACKAGES.slice(0, ALL_PACKAGES.indexOf('Axial')).map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                  <SelectItem value="__tht_header" disabled>── THT ──</SelectItem>
                  {ALL_PACKAGES.slice(ALL_PACKAGES.indexOf('DIP-8')).map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>Menge</Label>
              <Input type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mindestmenge</Label>
              <Input type="number" min="0" value={minQuantity} onChange={e => setMinQuantity(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Stückpreis (€)</Label>
              <Input type="number" min="0" step="0.0001" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label>Lagerort</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="z.B. Regal A3" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Hersteller</Label>
            <Input value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="z.B. Yageo, Samsung" />
          </div>

          <div className="space-y-2">
            <Label>Barcode</Label>
            <Input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="EAN / Bestellnummer" />
          </div>

          <div className="space-y-2">
            <Label>Datenblatt-URL</Label>
            <Input value={datasheetUrl} onChange={e => setDatasheetUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-2">
            <Label>Nachkauf-Link</Label>
            <Input value={purchaseUrl} onChange={e => setPurchaseUrl(e.target.value)} placeholder="https://mouser.com/..." />
          </div>

          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Zusätzliche Notizen..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

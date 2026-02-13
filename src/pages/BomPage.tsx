import { useState } from 'react';
import { useBomLists } from '@/hooks/useBom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CircuitBoard, Plus, Pencil, Trash2, FileText, Download, Upload, ClipboardList, Package } from 'lucide-react';
import { BomDetail } from '@/components/BomDetail';
import { BomCsvImportDialog } from '@/components/BomCsvImportDialog';
import { Link, useLocation } from 'react-router-dom';

const BomPage = () => {
  const { bomLists, addBomList, updateBomList, deleteBomList } = useBomLists();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const handleNew = () => {
    setEditId(null);
    setName('');
    setDescription('');
    setDialogOpen(true);
  };

  const handleEdit = (bom: { id: string; name: string; description?: string }) => {
    setEditId(bom.id);
    setName(bom.name);
    setDescription(bom.description || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editId) {
      await updateBomList(editId, { name: name.trim(), description: description.trim() || undefined });
    } else {
      await addBomList(name.trim(), description.trim() || undefined);
    }
    setDialogOpen(false);
  };

  const selectedBom = bomLists.find(b => b.id === selectedBomId);

  if (selectedBom) {
    return (
      <div className="min-h-screen pcb-grid">
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="container flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <CircuitBoard className="h-7 w-7 text-primary" />
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                Bauteil<span className="text-primary">Verwaltung</span>
              </h1>
            </div>
            <nav className="flex items-center gap-1">
              <Link to="/" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                <Package className="h-4 w-4" /> Bauteile
              </Link>
              <Link to="/bom" className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
                <ClipboardList className="h-4 w-4 text-primary" /> Stücklisten
              </Link>
            </nav>
          </div>
        </header>
        <main className="container py-8">
          <BomDetail bom={selectedBom} onBack={() => setSelectedBomId(null)} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pcb-grid">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <CircuitBoard className="h-7 w-7 text-primary" />
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
              Bauteil<span className="text-primary">Verwaltung</span>
            </h1>
          </div>
          <nav className="flex items-center gap-1">
            <Link to="/" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <Package className="h-4 w-4" /> Bauteile
            </Link>
            <Link to="/bom" className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
              <ClipboardList className="h-4 w-4 text-primary" /> Stücklisten
            </Link>
          </nav>
        </div>
      </header>

      <main className="container py-8">
        <section className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Stücklisten
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Neue Stückliste
            </Button>
          </div>
        </section>

        {bomLists.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-display text-muted-foreground">Keine Stücklisten vorhanden</p>
            <p className="mt-1 text-sm text-muted-foreground">Erstelle deine erste Stückliste.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-display">Name</TableHead>
                  <TableHead className="font-display">Beschreibung</TableHead>
                  <TableHead className="font-display">Erstellt</TableHead>
                  <TableHead className="font-display text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bomLists.map(bom => (
                  <TableRow key={bom.id} className="group cursor-pointer" onClick={() => setSelectedBomId(bom.id)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        {bom.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{bom.description || '–'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(bom.createdAt).toLocaleDateString('de-DE')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button size="icon" variant="ghost" className="h-8 w-8"
                          onClick={e => { e.stopPropagation(); handleEdit(bom); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={e => { e.stopPropagation(); deleteBomList(bom.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-primary">
              {editId ? 'Stückliste bearbeiten' : 'Neue Stückliste'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Netzteil v2.1" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Beschreibung</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BomCsvImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
};

export default BomPage;

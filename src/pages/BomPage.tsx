import { useState } from 'react';
import { useBomLists } from '@/hooks/useBom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CircuitBoard, Plus, Pencil, Trash2, FileText, Download, Upload, ClipboardList, Package, Copy, Factory, BarChart3, Settings } from 'lucide-react';
import { BomDetail } from '@/components/BomDetail';
import { BomCsvImportDialog } from '@/components/BomCsvImportDialog';
import { Link, useLocation } from 'react-router-dom';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

const BomPage = () => {
  const { bomLists, addBomList, updateBomList, deleteBomList, duplicateBomList } = useBomLists();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('v1.0');
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateSourceId, setDuplicateSourceId] = useState<string | null>(null);
  const [duplicateVersion, setDuplicateVersion] = useState('');

  const handleNew = () => {
    setEditId(null);
    setName('');
    setDescription('');
    setVersion('v1.0');
    setDialogOpen(true);
  };

  const handleEdit = (bom: { id: string; name: string; description?: string; version: string }) => {
    setEditId(bom.id);
    setName(bom.name);
    setDescription(bom.description || '');
    setVersion(bom.version);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editId) {
      await updateBomList(editId, { name: name.trim(), description: description.trim() || undefined, version: version.trim() || undefined });
    } else {
      await addBomList(name.trim(), description.trim() || undefined, version.trim() || undefined);
    }
    setDialogOpen(false);
  };

  const handleDuplicate = (bom: { id: string; version: string }) => {
    setDuplicateSourceId(bom.id);
    const parts = bom.version.match(/^(v?)(\d+)\.(\d+)$/);
    if (parts) {
      setDuplicateVersion(`${parts[1]}${parts[2]}.${parseInt(parts[3]) + 1}`);
    } else {
      setDuplicateVersion(bom.version + '.1');
    }
    setDuplicateDialogOpen(true);
  };

  const handleDuplicateConfirm = async () => {
    if (!duplicateSourceId || !duplicateVersion.trim()) return;
    await duplicateBomList(duplicateSourceId, duplicateVersion.trim());
    setDuplicateDialogOpen(false);
  };

  const selectedBom = bomLists.find(b => b.id === selectedBomId);

  if (selectedBom) {
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
              <Link to="/bom" className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
                <ClipboardList className="h-4 w-4 text-primary" /> Stücklisten
              </Link>
              <Link to="/production" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                <Factory className="h-4 w-4" /> Produktion
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
        {/* Mobile bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-border bg-background/95 backdrop-blur-md">
          <Link to="/" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-muted-foreground">
            <Package className="h-5 w-5" />
            <span className="font-display text-[10px] font-medium">Bauteile</span>
          </Link>
          <Link to="/bom" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-primary">
            <ClipboardList className="h-5 w-5" />
            <span className="font-display text-[10px] font-medium">Stücklisten</span>
          </Link>
          <Link to="/production" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-muted-foreground">
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
        <main className="container py-4 md:py-8">
          <BomDetail bom={selectedBom} onBack={() => setSelectedBomId(null)} />
        </main>
      </div>
    );
  }

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
              <Link to="/bom" className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
                <ClipboardList className="h-4 w-4 text-primary" /> Stücklisten
              </Link>
              <Link to="/production" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                <Factory className="h-4 w-4" /> Produktion
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

      {/* Mobile bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-border bg-background/95 backdrop-blur-md">
          <Link to="/" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-muted-foreground">
            <Package className="h-5 w-5" />
            <span className="font-display text-[10px] font-medium">Bauteile</span>
          </Link>
          <Link to="/bom" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-primary">
            <ClipboardList className="h-5 w-5" />
            <span className="font-display text-[10px] font-medium">Stücklisten</span>
          </Link>
          <Link to="/production" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-muted-foreground">
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

      <main className="container py-4 md:py-8">
        <section className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Stücklisten
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button onClick={handleNew} size="sm" className="gap-1.5 sm:gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Neue Stückliste</span>
              <span className="sm:hidden">Neu</span>
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
          <>
            {/* Mobile card layout */}
            <div className="flex flex-col gap-2 md:hidden">
              {bomLists.map(bom => (
                <div key={bom.id} className="rounded-lg border border-border bg-card p-3" onClick={() => setSelectedBomId(bom.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium text-sm text-foreground truncate">{bom.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="font-display text-[10px]">{bom.version}</Badge>
                        {bom.description && <span className="text-xs text-muted-foreground truncate">{bom.description}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(bom.createdAt).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  <div className="flex justify-end gap-1 mt-2 border-t border-border pt-2">
                    <Button size="icon" variant="ghost" className="h-10 w-10"
                      onClick={e => { e.stopPropagation(); handleDuplicate(bom); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-10 w-10"
                      onClick={e => { e.stopPropagation(); handleEdit(bom); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-10 w-10 text-destructive hover:text-destructive"
                      onClick={e => { e.stopPropagation(); setDeleteId(bom.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-display">Name</TableHead>
                    <TableHead className="font-display">Version</TableHead>
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
                      <TableCell>
                        <Badge variant="outline" className="font-display text-xs">{bom.version}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{bom.description || '–'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(bom.createdAt).toLocaleDateString('de-DE')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button size="icon" variant="ghost" className="h-10 w-10"
                            onClick={e => { e.stopPropagation(); handleDuplicate(bom); }}
                            title="Duplizieren">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-10 w-10"
                            onClick={e => { e.stopPropagation(); handleEdit(bom); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-10 w-10 text-destructive hover:text-destructive"
                            onClick={e => { e.stopPropagation(); setDeleteId(bom.id); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)]">
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Version</label>
              <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="z.B. v1.0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BomCsvImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Duplicate dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="sm:max-w-sm w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="font-display text-primary">Stückliste duplizieren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Neue Version *</label>
              <Input value={duplicateVersion} onChange={e => setDuplicateVersion(e.target.value)} placeholder="z.B. v1.1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleDuplicateConfirm} disabled={!duplicateVersion.trim()}>Duplizieren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={open => { if (!open) setDeleteId(null); }}
        onConfirm={() => { if (deleteId) { deleteBomList(deleteId); setDeleteId(null); } }}
        title="Stückliste löschen?"
        description="Die Stückliste und alle zugeordneten Positionen werden unwiderruflich gelöscht."
      />
    </div>
  );
};

export default BomPage;

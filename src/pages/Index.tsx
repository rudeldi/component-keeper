import { useState, useMemo } from 'react';
import { useComponents } from '@/hooks/useComponents';
import { CATEGORIES } from '@/data/constants';
import { ComponentCategory, ElectronicComponent } from '@/types/component';
import { CategoryCard } from '@/components/CategoryCard';
import { ComponentTable } from '@/components/ComponentTable';
import { ComponentDialog } from '@/components/ComponentDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, CircuitBoard, Package, AlertTriangle, Download, Upload, ClipboardList, ScanBarcode } from 'lucide-react';
import { downloadCsv } from '@/lib/csv';
import { CsvImportDialog } from '@/components/CsvImportDialog';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { Link } from 'react-router-dom';

const Index = () => {
  const { components, addComponent, updateComponent, deleteComponent } = useComponents();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ElectronicComponent | undefined>();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [importOpen, setImportOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CATEGORIES.forEach(c => { counts[c.id] = 0; });
    components.forEach(c => { counts[c.category] = (counts[c.category] || 0) + 1; });
    return counts;
  }, [components]);

  const filteredComponents = useMemo(() => {
    return components.filter(c => {
      if (filterCategory !== 'all' && c.category !== filterCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.type.toLowerCase().includes(q) ||
          c.value?.toLowerCase().includes(q) ||
          c.package.toLowerCase().includes(q) ||
          c.barcode?.toLowerCase().includes(q) ||
          c.manufacturer?.toLowerCase().includes(q) ||
          c.location?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [components, search, filterCategory]);

  const lowStockCount = useMemo(() =>
    components.filter(c => c.minQuantity != null && c.quantity <= c.minQuantity).length,
    [components]
  );

  const handleCategoryClick = (id: ComponentCategory) => {
    setFilterCategory(prev => prev === id ? 'all' : id);
  };

  const handleEdit = (comp: ElectronicComponent) => {
    setEditTarget(comp);
    setDialogOpen(true);
  };

  const handleSave = (data: Omit<ElectronicComponent, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editTarget) {
      updateComponent(editTarget.id, data);
    } else {
      addComponent(data);
    }
    setEditTarget(undefined);
  };

  const handleDialogOpen = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditTarget(undefined);
  };

  return (
    <div className="min-h-screen pcb-grid">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <CircuitBoard className="h-7 w-7 text-primary" />
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
              Bauteil<span className="text-primary">Verwaltung</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {lowStockCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-display font-medium">{lowStockCount} niedrig</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-display text-sm font-semibold text-foreground">{components.length}</span>
              <span className="text-sm text-muted-foreground">Bauteile</span>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <Link to="/" className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
              <Package className="h-4 w-4 text-primary" /> Bauteile
            </Link>
            <Link to="/bom" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ClipboardList className="h-4 w-4" /> Stücklisten
            </Link>
          </nav>
        </div>
      </header>

      <main className="container py-8">
        {/* Category Grid */}
        <section className="mb-8">
          <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Kategorien
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {CATEGORIES.map(cat => (
              <CategoryCard
                key={cat.id}
                categoryId={cat.id}
                count={categoryCounts[cat.id] || 0}
                onClick={() => handleCategoryClick(cat.id)}
              />
            ))}
          </div>
        </section>

        {/* Toolbar */}
        <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Alle Kategorien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setScannerOpen(true)} className="gap-1.5">
              <ScanBarcode className="h-4 w-4" />
              Scan
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadCsv(filteredComponents)} className="gap-1.5">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Bauteil anlegen
            </Button>
          </div>
        </section>

        {/* Active filter */}
        {filterCategory !== 'all' && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter:</span>
            <Button variant="secondary" size="sm" onClick={() => setFilterCategory('all')} className="gap-1 font-display text-xs">
              {CATEGORIES.find(c => c.id === filterCategory)?.label} ✕
            </Button>
          </div>
        )}

        {/* Table */}
        <ComponentTable
          components={filteredComponents}
          onEdit={handleEdit}
          onDelete={deleteComponent}
        />
      </main>

      {/* Dialogs */}
      <ComponentDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpen}
        onSave={handleSave}
        initial={editTarget}
      />
      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={(items) => items.forEach(addComponent)}
      />
      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        components={components}
        onEdit={handleEdit}
      />
    </div>
  );
};

export default Index;

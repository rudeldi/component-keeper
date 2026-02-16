import { useState, useEffect, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabase-config';
import { CATEGORIES } from '@/data/constants';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  CircuitBoard, Package, ClipboardList, Factory, BarChart3,
  AlertTriangle, Boxes, TrendingDown, ShoppingCart, Euro,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

interface ComponentRow {
  id: string;
  name: string;
  category: string;
  quantity: number;
  min_quantity: number | null;
  value: string | null;
  purchase_url: string | null;
  unit_price: number | null;
}

interface ProductionRun {
  id: string;
  bom_name: string;
  quantity: number;
  created_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  resistors: 'hsl(175, 70%, 45%)',
  capacitors: 'hsl(200, 70%, 55%)',
  inductors: 'hsl(40, 80%, 55%)',
  diodes: 'hsl(0, 65%, 55%)',
  transistors: 'hsl(280, 60%, 55%)',
  ics: 'hsl(220, 60%, 55%)',
  connectors: 'hsl(150, 60%, 45%)',
  leds: 'hsl(60, 80%, 50%)',
  crystals: 'hsl(300, 50%, 55%)',
  fuses: 'hsl(20, 70%, 50%)',
  relays: 'hsl(100, 50%, 45%)',
  other: 'hsl(220, 10%, 55%)',
};

const StatsPage = () => {
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [productions, setProductions] = useState<ProductionRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    Promise.all([
      supabase.from('components').select('id, name, category, quantity, min_quantity, value, purchase_url, unit_price'),
      supabase.from('production_runs').select('*').order('created_at', { ascending: false }).limit(10),
    ]).then(([compRes, prodRes]) => {
      if (compRes.data) setComponents(compRes.data as ComponentRow[]);
      if (prodRes.data) setProductions(prodRes.data as ProductionRun[]);
      setLoading(false);
    });
  }, []);

  const totalParts = components.length;
  const totalStock = useMemo(() => components.reduce((s, c) => s + c.quantity, 0), [components]);
  const lowStock = useMemo(() => components.filter(c => c.min_quantity != null && c.quantity <= c.min_quantity), [components]);
  const totalProduced = useMemo(() => productions.reduce((s, p) => s + p.quantity, 0), [productions]);
  const totalValue = useMemo(() => components.reduce((s, c) => s + (c.unit_price ? c.unit_price * c.quantity : 0), 0), [components]);

  // Category chart data
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    components.forEach(c => { counts[c.category] = (counts[c.category] || 0) + 1; });
    return CATEGORIES
      .map(cat => ({ name: cat.label, value: counts[cat.id] || 0, id: cat.id }))
      .filter(d => d.value > 0);
  }, [components]);

  // Stock distribution by category
  const stockByCategory = useMemo(() => {
    const sums: Record<string, number> = {};
    components.forEach(c => { sums[c.category] = (sums[c.category] || 0) + c.quantity; });
    return CATEGORIES
      .map(cat => ({ name: cat.label, value: sums[cat.id] || 0, id: cat.id }))
      .filter(d => d.value > 0);
  }, [components]);

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
            <Link to="/production" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <Factory className="h-4 w-4" /> Produktion
            </Link>
            <Link to="/stats" className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
              <BarChart3 className="h-4 w-4 text-primary" /> Statistik
            </Link>
          </nav>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-border bg-background/95 backdrop-blur-md">
        <Link to="/" className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-muted-foreground">
          <Package className="h-5 w-5" />
          <span className="font-display text-[10px] font-medium">Bauteile</span>
        </Link>
        <Link to="/bom" className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-muted-foreground">
          <ClipboardList className="h-5 w-5" />
          <span className="font-display text-[10px] font-medium">Stücklisten</span>
        </Link>
        <Link to="/production" className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-muted-foreground">
          <Factory className="h-5 w-5" />
          <span className="font-display text-[10px] font-medium">Produktion</span>
        </Link>
        <Link to="/stats" className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-primary">
          <BarChart3 className="h-5 w-5" />
          <span className="font-display text-[10px] font-medium">Statistik</span>
        </Link>
      </nav>

      <main className="container py-4 md:py-8 max-w-5xl">
        <h2 className="font-display text-base md:text-lg font-semibold text-foreground flex items-center gap-2 mb-6">
          <BarChart3 className="h-5 w-5 text-primary" />
          Statistik-Dashboard
        </h2>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <Card className="glow-primary">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-display text-muted-foreground flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5" /> Bauteile
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <span className="font-display text-2xl md:text-3xl font-bold text-foreground">{totalParts}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-display text-muted-foreground flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" /> Gesamtbestand
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <span className="font-display text-2xl md:text-3xl font-bold text-foreground">{totalStock.toLocaleString('de-DE')}</span>
            </CardContent>
          </Card>

          <Card className="glow-primary">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-display text-muted-foreground flex items-center gap-1.5">
                <Euro className="h-3.5 w-3.5" /> Lagerwert
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <span className="font-display text-2xl md:text-3xl font-bold text-foreground">
                {totalValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-muted-foreground ml-1">€</span>
            </CardContent>
          </Card>

          <Card className={lowStock.length > 0 ? 'border-destructive/30' : ''}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-display text-muted-foreground flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" /> Niedrige Bestände
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <span className={`font-display text-2xl md:text-3xl font-bold ${lowStock.length > 0 ? 'text-destructive' : 'text-foreground'}`}>
                {lowStock.length}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-display text-muted-foreground flex items-center gap-1.5">
                <Factory className="h-3.5 w-3.5" /> Produziert
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <span className="font-display text-2xl md:text-3xl font-bold text-foreground">{totalProduced}</span>
              <span className="text-xs text-muted-foreground ml-1">Platinen</span>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Bauteile pro Kategorie</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categoryData} margin={{ top: 5, right: 5, bottom: 40, left: 0 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: 'hsl(220, 10%, 55%)' }}
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 10%, 55%)' }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'hsl(220, 18%, 13%)', border: '1px solid hsl(220, 15%, 20%)', borderRadius: '8px', fontSize: 12 }}
                      labelStyle={{ color: 'hsl(180, 10%, 90%)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {categoryData.map((entry) => (
                        <Cell key={entry.id} fill={CATEGORY_COLORS[entry.id] || CATEGORY_COLORS.other} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">Keine Daten</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Bestand nach Kategorie</CardTitle>
            </CardHeader>
            <CardContent>
              {stockByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stockByCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                      style={{ fontSize: 10 }}
                    >
                      {stockByCategory.map((entry) => (
                        <Cell key={entry.id} fill={CATEGORY_COLORS[entry.id] || CATEGORY_COLORS.other} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'hsl(220, 18%, 13%)', border: '1px solid hsl(220, 15%, 20%)', borderRadius: '8px', fontSize: 12 }}
                      formatter={(value: number) => value.toLocaleString('de-DE')}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">Keine Daten</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Low stock & recent productions side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Low Stock */}
          <Card className={lowStock.length > 0 ? 'border-destructive/20' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Niedrige Bestände
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStock.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Alle Bestände ausreichend ✓</p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-display text-xs">Bauteil</TableHead>
                        <TableHead className="font-display text-xs text-right">Menge</TableHead>
                        <TableHead className="font-display text-xs text-right">Min</TableHead>
                        <TableHead className="font-display text-xs w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStock.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm">
                            <span className="font-medium">{c.name}</span>
                            {c.value && <span className="ml-1 text-muted-foreground text-xs">{c.value}</span>}
                          </TableCell>
                          <TableCell className="text-sm text-right font-mono text-destructive font-semibold">{c.quantity}</TableCell>
                          <TableCell className="text-sm text-right font-mono text-muted-foreground">{c.min_quantity}</TableCell>
                          <TableCell>
                            {c.purchase_url && (
                              <a href={c.purchase_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                                <ShoppingCart className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Productions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Factory className="h-4 w-4 text-primary" />
                Letzte Produktionen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Noch keine Produktionen</p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-display text-xs">Datum</TableHead>
                        <TableHead className="font-display text-xs">Stückliste</TableHead>
                        <TableHead className="font-display text-xs text-right">Menge</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productions.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(p.created_at), 'dd.MM.yy HH:mm', { locale: de })}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{p.bom_name}</TableCell>
                          <TableCell className="text-sm text-right font-mono">{p.quantity}×</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StatsPage;

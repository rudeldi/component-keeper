import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CircuitBoard, Package, ClipboardList, Factory, BarChart3, Settings, Save, RotateCcw, CheckCircle2, Database } from 'lucide-react';
import { getCustomConfig, setCustomConfig, clearCustomConfig, hasCustomConfig } from '@/lib/supabase-config';
import { useToast } from '@/hooks/use-toast';

const SettingsPage = () => {
  const existing = getCustomConfig();
  const [url, setUrl] = useState(existing.url);
  const [key, setKey] = useState(existing.key);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    setCustomConfig(url, key);
    setSaved(true);
    toast({
      title: 'Einstellungen gespeichert',
      description: 'Die Datenbankverbindung wurde aktualisiert. Die Seite wird neu geladen.',
    });
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleReset = () => {
    clearCustomConfig();
    setUrl('');
    setKey('');
    setSaved(false);
    toast({
      title: 'Zurückgesetzt',
      description: 'Es wird wieder die Standard-Datenbank verwendet. Die Seite wird neu geladen.',
    });
    setTimeout(() => window.location.reload(), 1500);
  };

  const isCustom = hasCustomConfig();

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
            <Link to="/stats" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <BarChart3 className="h-4 w-4" /> Statistik
            </Link>
            <Link to="/settings" className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
              <Settings className="h-4 w-4 text-primary" /> Einstellungen
            </Link>
          </nav>
        </div>
      </header>

      {/* Mobile bottom navigation */}
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
        <Link to="/stats" className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-muted-foreground">
          <BarChart3 className="h-5 w-5" />
          <span className="font-display text-[10px] font-medium">Statistik</span>
        </Link>
        <Link to="/settings" className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-primary">
          <Settings className="h-5 w-5" />
          <span className="font-display text-[10px] font-medium">Einstellungen</span>
        </Link>
      </nav>

      <main className="container py-6 md:py-10 max-w-2xl">
        <h2 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> Einstellungen
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Datenbankverbindung
            </CardTitle>
            <CardDescription>
              Konfiguriere die Verbindung zu deiner eigenen Supabase-Datenbank. Lasse die Felder leer, um die Standard-Datenbank zu verwenden.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCustom && (
              <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Eigene Datenbank aktiv
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="supabase-url">Supabase URL</Label>
              <Input
                id="supabase-url"
                placeholder="https://xxxxx.supabase.co"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supabase-key">Anon / Publishable Key</Label>
              <Input
                id="supabase-key"
                placeholder="eyJhbGciOi..."
                value={key}
                onChange={e => setKey(e.target.value)}
                type="password"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={!url || !key} className="gap-1.5">
                <Save className="h-4 w-4" /> Speichern
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={!isCustom} className="gap-1.5">
                <RotateCcw className="h-4 w-4" /> Zurücksetzen
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SettingsPage;

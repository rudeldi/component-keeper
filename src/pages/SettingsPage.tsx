import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CircuitBoard, Package, ClipboardList, Factory, BarChart3, Settings, Save, RotateCcw, CheckCircle2, Database, Wifi, WifiOff, Loader2, RefreshCw, Download, AlertCircle, GitCommit } from 'lucide-react';
import { getCustomConfig, setCustomConfig, clearCustomConfig, hasCustomConfig } from '@/lib/supabase-config';
import { useToast } from '@/hooks/use-toast';

// ─── Update-Status Typen ───────────────────────────────────────────────────
interface UpdateStatus {
  deployed: string;
  latest: string;
  upToDate: boolean;
  isUpdating: boolean;
  deployedDate: string;
}

// ─── Update-Karte (nur sichtbar wenn /api/update erreichbar) ──────────────
const UpdateCard = () => {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/update/status', { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: UpdateStatus = await res.json();
      setStatus(data);
      setAvailable(true);
      setError(null);
      return data;
    } catch {
      return null;
    }
  }, []);

  // Beim Laden prüfen ob Update-API erreichbar
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Polling während Update läuft
  useEffect(() => {
    if (!status?.isUpdating) return;
    const interval = setInterval(async () => {
      const data = await fetchStatus();
      if (data && !data.isUpdating) {
        clearInterval(interval);
        toast({
          title: 'Update abgeschlossen ✓',
          description: 'Die Seite wird in 3 Sekunden neu geladen.',
        });
        setTimeout(() => window.location.reload(), 3000);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [status?.isUpdating, fetchStatus, toast]);

  const handleCheck = async () => {
    setChecking(true);
    setError(null);
    const data = await fetchStatus();
    if (!data) setError('Update-Server nicht erreichbar.');
    setChecking(false);
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch('/api/update/start', { method: 'POST' });
      if (!res.ok) throw new Error();
      // Optimistisch: isUpdating auf true setzen
      setStatus(prev => prev ? { ...prev, isUpdating: true } : prev);
      toast({
        title: 'Update gestartet',
        description: 'Das Update wird im Hintergrund installiert. Bitte warten…',
      });
    } catch {
      toast({
        title: 'Fehler',
        description: 'Update konnte nicht gestartet werden.',
        variant: 'destructive',
      });
    }
  };

  if (!available) return null;

  const shortHash = (h: string) => h.slice(0, 7);
  const formatDate = (d: string) => {
    try {
      // Normalize git date formats: "2026-03-30 20:11:19 +0000" → "2026-03-30T20:11:19+0000"
      const iso = d.trim().replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2}:?\d{2})$/, '$1T$2$3');
      const date = new Date(iso);
      if (isNaN(date.getTime())) return d;
      return date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
    } catch { return d; }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          Software-Update
        </CardTitle>
        <CardDescription>
          Prüfe auf neue Versionen und installiere Updates direkt aus den Einstellungen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Versionsstatus */}
        {status && (
          <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <GitCommit className="h-3.5 w-3.5" /> Installiert
              </span>
              <span className="font-mono text-xs">{shortHash(status.deployed)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <GitCommit className="h-3.5 w-3.5" /> Verfügbar
              </span>
              <span className="font-mono text-xs">{shortHash(status.latest)}</span>
            </div>
            {status.deployedDate && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Stand</span>
                <span className="text-xs">{formatDate(status.deployedDate)}</span>
              </div>
            )}
          </div>
        )}

        {/* Update-Banner */}
        {status && status.upToDate && !status.isUpdating && (
          <div className="flex items-center gap-2 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            App ist aktuell
          </div>
        )}
        {status && !status.upToDate && !status.isUpdating && (
          <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 px-3 py-2 text-sm text-yellow-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Update verfügbar — Commit {shortHash(status.latest)}
          </div>
        )}
        {status?.isUpdating && (
          <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            Update wird installiert… bitte warten
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <WifiOff className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Aktions-Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleCheck}
            disabled={checking || status?.isUpdating}
            className="gap-1.5"
          >
            {checking
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" />}
            Prüfen
          </Button>

          {status && !status.upToDate && !status.isUpdating && (
            <Button onClick={handleUpdate} className="gap-1.5">
              <Download className="h-4 w-4" />
              Update installieren
            </Button>
          )}
        </div>

      </CardContent>
    </Card>
  );
};

// ─── Haupt-Seite ──────────────────────────────────────────────────────────
const SettingsPage = () => {
  const existing = getCustomConfig();
  const [url, setUrl] = useState(existing.url);
  const [key, setKey] = useState(existing.key);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
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
        <Link to="/" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-muted-foreground">
          <Package className="h-5 w-5" />
          <span className="font-display text-[10px] font-medium">Bauteile</span>
        </Link>
        <Link to="/bom" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-muted-foreground">
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
        <Link to="/settings" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-primary">
          <Settings className="h-5 w-5" />
          <span className="font-display text-[10px] font-medium">Einstellungen</span>
        </Link>
      </nav>

      <main className="container py-6 md:py-10 max-w-2xl space-y-6">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> Einstellungen
        </h2>

        {/* Datenbankverbindung */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Datenbankverbindung
            </CardTitle>
            <CardDescription>
              Verbinde dich mit einer Supabase-Datenbank – egal ob in der Cloud (z.B. supabase.co) oder lokal / im eigenen Netzwerk (z.B. selbst gehostetes Supabase). Lasse die Felder leer, um die Standard-Datenbank zu verwenden.
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
                placeholder="https://xxxxx.supabase.co oder http://192.168.1.100:8000"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Cloud, lokal oder im eigenen Netzwerk – jede erreichbare Supabase-Instanz wird unterstützt.</p>
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

            {testResult === 'success' && (
              <div className="flex items-center gap-2 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
                <Wifi className="h-4 w-4" />
                Verbindung erfolgreich!
              </div>
            )}
            {testResult === 'error' && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <WifiOff className="h-4 w-4" />
                Verbindung fehlgeschlagen. Bitte URL und Key prüfen.
              </div>
            )}

            <div className="flex gap-2 pt-2 flex-wrap">
              <Button
                variant="outline"
                disabled={!url || !key || testing}
                className="gap-1.5"
                onClick={async () => {
                  setTesting(true);
                  setTestResult(null);
                  try {
                    const testClient = createClient(url, key);
                    const { error } = await testClient.from('components').select('id').limit(1);
                    setTestResult(error ? 'error' : 'success');
                  } catch {
                    setTestResult('error');
                  }
                  setTesting(false);
                }}
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                Verbindung testen
              </Button>
              <Button onClick={handleSave} disabled={!url || !key} className="gap-1.5">
                <Save className="h-4 w-4" /> Speichern
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={!isCustom} className="gap-1.5">
                <RotateCcw className="h-4 w-4" /> Zurücksetzen
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Software-Update (nur sichtbar wenn Update-Server erreichbar) */}
        <UpdateCard />

      </main>
    </div>
  );
};

export default SettingsPage;

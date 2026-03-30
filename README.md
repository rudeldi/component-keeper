# BauteilVerwaltung

Eine lokale Verwaltungs-App für elektronische Bauteile — mit Stücklisten, Lagerverwaltung und Produktionsplanung.

Gebaut mit **Vite · React · TypeScript · Tailwind CSS · shadcn/ui · Supabase**.

---

## Voraussetzungen

| Tool | Version | Installation |
|------|---------|-------------|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| Docker | aktuell | [docker.com](https://docs.docker.com/get-docker/) |
| Supabase CLI | aktuell | [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli) |
| Git | aktuell | [git-scm.com](https://git-scm.com) |

---

## Installation

### 1. Repository klonen

```bash
git clone <REPO_URL>
cd <REPO_NAME>
```

### 2. Umgebungsvariablen einrichten

```bash
cp .env.example .env
```

Öffne `.env` und trage deine Supabase-Zugangsdaten ein (siehe Abschnitt [Supabase einrichten](#supabase-einrichten)).

> ⚠️ **Wichtig:** Die `.env`-Datei niemals in Git committen — sie ist bereits in `.gitignore` eingetragen.

### 3. Abhängigkeiten installieren

```bash
npm install
```

### 4. Supabase einrichten

#### Option A — Lokal (empfohlen für Self-Hosting)

```bash
supabase start
```

Nach dem Start zeigt die CLI deine lokalen Zugangsdaten:

```
API URL:     http://127.0.0.1:54321
Publishable: sb_publishable_...
```

Trage diese Werte in deine `.env` ein:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Alle Datenbank-Migrationen werden beim Start automatisch angewendet.

#### Option B — Supabase Cloud

1. Neues Projekt auf [supabase.com](https://supabase.com) anlegen
2. Unter **Project Settings → API** die URL und den `anon`-Key kopieren
3. In `.env` eintragen:

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
```

4. Migrationen ausführen:

```bash
supabase db push
```

### 5. App starten

#### Entwicklung

```bash
npm run dev
```

Die App ist unter `http://localhost:5173` erreichbar.

#### Produktion (Self-Hosting mit Docker + Caddy)

Erstelle im übergeordneten Verzeichnis folgende Struktur:

```
hosting/
├── app/              ← dieses Repository (geklont)
├── dist/             ← wird beim Build befüllt
├── caddy/
│   └── Caddyfile
└── docker-compose.yml
```

**`caddy/Caddyfile`** — ersetze `SERVER_IP` mit der IP-Adresse deines Servers:

```
http://SERVER_IP {
  root * /srv
  file_server
  encode zstd gzip
  try_files {path} /index.html
}
```

**`docker-compose.yml`**:

```yaml
services:
  build:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./app:/app
      - ./dist:/app/dist
    command: sh -c "npm ci && npm run build"
    profiles: ["build"]

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - ./dist:/srv:ro
      - caddy_data:/data
      - caddy_config:/config

volumes:
  caddy_data:
  caddy_config:
```

**App bauen und starten:**

```bash
# Frontend bauen
docker compose run --rm build

# Caddy starten
docker compose up -d caddy
```

Die App ist unter `http://SERVER_IP` erreichbar.

**Update nach Code-Änderungen:**

```bash
git pull
docker compose run --rm build
```

---

## Supabase beim Systemstart automatisch starten

Alle Supabase-Container laufen mit der Docker-Restart-Policy `unless-stopped` und starten automatisch mit dem Docker-Daemon. Stelle sicher, dass Docker beim Systemstart aktiviert ist:

```bash
# Linux (systemd)
sudo systemctl enable docker

# Supabase einmalig starten (danach automatisch)
supabase start
```

---

## Projektstruktur

```
src/
├── components/          UI-Komponenten (shadcn/ui)
├── hooks/               React Query Hooks für Datenbankzugriffe
├── integrations/
│   └── supabase/        Generierter Client & TypeScript-Typen
├── lib/
│   └── supabase-config.ts   Verbindungslogik (env vars / localStorage)
└── pages/               Seiten (Bauteile, Stücklisten, Produktion, …)

supabase/
├── config.toml          Supabase CLI Konfiguration
└── migrations/          Datenbankschema (wird automatisch angewendet)
```

---

## Datenbank-Schema

| Tabelle | Beschreibung |
|---------|-------------|
| `components` | Bauteile mit Eigenschaften & Bestand |
| `stock_locations` | Lagerorte pro Bauteil |
| `stock_movements` | Bestandsbewegungen (Ein-/Ausgang) |
| `bom_lists` | Stücklisten |
| `bom_items` | Positionen einer Stückliste |
| `production_runs` | Produktionsdurchläufe |

---

## Entwicklung mit Lovable

Das Projekt wurde mit [Lovable](https://lovable.dev) erstellt. Änderungen in Lovable werden automatisch in dieses Repository gepusht.

Lokale Änderungen zurück zu Lovable bringen:

```bash
git push origin main
```

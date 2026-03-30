import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const STORAGE_KEY_URL = 'custom_supabase_url';
const STORAGE_KEY_KEY = 'custom_supabase_key';

// Check if we're running on Lovable's preview domain
function isLovablePreview(): boolean {
  const host = window.location.hostname;
  return host.includes('lovable.app') || host.includes('lovableproject.com') || host === 'localhost';
}

// Check if build-time env vars are available
function hasEnvConfig(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return !!(url && key);
}

export function getCustomConfig() {
  return {
    url: localStorage.getItem(STORAGE_KEY_URL) || '',
    key: localStorage.getItem(STORAGE_KEY_KEY) || '',
  };
}

export function setCustomConfig(url: string, key: string) {
  if (url) {
    localStorage.setItem(STORAGE_KEY_URL, url);
  } else {
    localStorage.removeItem(STORAGE_KEY_URL);
  }
  if (key) {
    localStorage.setItem(STORAGE_KEY_KEY, key);
  } else {
    localStorage.removeItem(STORAGE_KEY_KEY);
  }
}

export function clearCustomConfig() {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
}

export function hasCustomConfig(): boolean {
  const { url, key } = getCustomConfig();
  return !!(url && key);
}

// When served over HTTPS locally (e.g. bauteilserver.local), Supabase is proxied
// via the same origin at /supabase — no manual configuration needed.
function isHttpsLocal(): boolean {
  return window.location.protocol === 'https:' && !isLovablePreview();
}

function getHttpsLocalClient(): SupabaseClient<Database> {
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const proxyUrl = `${window.location.origin}/supabase`;
  return createClient<Database>(proxyUrl, key, {
    auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
  });
}

/** Returns true if the app has a usable database connection */
export function hasDatabaseConnection(): boolean {
  return hasCustomConfig() || isLovablePreview() || isHttpsLocal() || hasEnvConfig();
}

let customClient: SupabaseClient<Database> | null = null;
let defaultClient: SupabaseClient<Database> | null = null;
let httpsLocalClient: SupabaseClient<Database> | null = null;

function getDefaultClient(): SupabaseClient<Database> {
  if (!defaultClient) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      throw new Error('Keine Datenbankverbindung konfiguriert. Bitte unter Einstellungen konfigurieren.');
    }
    defaultClient = createClient<Database>(url, key, {
      auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
    });
  }
  return defaultClient;
}

export function getSupabaseClient(): SupabaseClient<Database> | null {
  const { url, key } = getCustomConfig();

  // 1. Custom config (user-set via Settings page) — always takes precedence
  if (url && key) {
    if (!customClient || (customClient as any).supabaseUrl !== url) {
      customClient = createClient<Database>(url, key, {
        auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
      });
      (customClient as any).supabaseUrl = url;
    }
    return customClient;
  }

  customClient = null;

  // 2. Lovable preview or direct env config (HTTP)
  if (isLovablePreview() || (!isHttpsLocal() && hasEnvConfig())) {
    return getDefaultClient();
  }

  // 3. HTTPS local — proxy Supabase via /supabase on the same origin (automatic)
  if (isHttpsLocal() && hasEnvConfig()) {
    if (!httpsLocalClient) {
      httpsLocalClient = getHttpsLocalClient();
    }
    return httpsLocalClient;
  }

  // No config available
  return null;
}

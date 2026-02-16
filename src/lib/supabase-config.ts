import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const STORAGE_KEY_URL = 'custom_supabase_url';
const STORAGE_KEY_KEY = 'custom_supabase_key';

// Check if we're running on Lovable's preview domain
function isLovablePreview(): boolean {
  const host = window.location.hostname;
  return host.includes('lovable.app') || host.includes('lovableproject.com') || host === 'localhost';
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

/** Returns true if the app has a usable database connection */
export function hasDatabaseConnection(): boolean {
  return hasCustomConfig() || isLovablePreview();
}

let customClient: SupabaseClient<Database> | null = null;
let defaultClient: SupabaseClient<Database> | null = null;

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

export function getSupabaseClient(): SupabaseClient<Database> {
  const { url, key } = getCustomConfig();
  
  // If custom config exists, always use it
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

  // Only use default (Lovable) client on Lovable domains
  if (isLovablePreview()) {
    return getDefaultClient();
  }
  
  // On external hosts without custom config: throw
  throw new Error('Keine Datenbankverbindung konfiguriert. Bitte unter Einstellungen konfigurieren.');
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { supabase as defaultClient } from '@/integrations/supabase/client';

const STORAGE_KEY_URL = 'custom_supabase_url';
const STORAGE_KEY_KEY = 'custom_supabase_key';

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

let customClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  const { url, key } = getCustomConfig();
  if (url && key) {
    // Recreate if config changed
    if (!customClient || (customClient as any).supabaseUrl !== url) {
      customClient = createClient<Database>(url, key, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      (customClient as any).supabaseUrl = url;
    }
    return customClient;
  }
  customClient = null;
  return defaultClient;
}

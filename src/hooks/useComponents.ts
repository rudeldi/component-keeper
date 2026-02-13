import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ElectronicComponent, ComponentCategory } from '@/types/component';

const STORAGE_KEY = 'electronic-components';
const MIGRATED_KEY = 'electronic-components-migrated';

// Map DB row to app type
function rowToComponent(row: any): ElectronicComponent {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ComponentCategory,
    type: row.type,
    value: row.value ?? undefined,
    package: row.package,
    quantity: row.quantity,
    minQuantity: row.min_quantity ?? undefined,
    location: row.location ?? undefined,
    barcode: row.barcode ?? undefined,
    datasheetUrl: row.datasheet_url ?? undefined,
    manufacturer: row.manufacturer ?? undefined,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Map app type to DB insert
function componentToRow(c: Omit<ElectronicComponent, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    name: c.name,
    category: c.category,
    type: c.type,
    value: c.value || null,
    package: c.package,
    quantity: c.quantity,
    min_quantity: c.minQuantity ?? null,
    location: c.location || null,
    barcode: c.barcode || null,
    datasheet_url: c.datasheetUrl || null,
    manufacturer: c.manufacturer || null,
    description: c.description || null,
  };
}

export function useComponents() {
  const [components, setComponents] = useState<ElectronicComponent[]>([]);
  const [loading, setLoading] = useState(true);

  // Migrate localStorage data once
  const migrateLocalStorage = useCallback(async () => {
    if (localStorage.getItem(MIGRATED_KEY)) return;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) { localStorage.setItem(MIGRATED_KEY, '1'); return; }
      const items: ElectronicComponent[] = JSON.parse(data);
      if (items.length === 0) { localStorage.setItem(MIGRATED_KEY, '1'); return; }
      const rows = items.map(c => componentToRow(c));
      await supabase.from('components').insert(rows);
      localStorage.setItem(MIGRATED_KEY, '1');
    } catch {
      // silent fail
    }
  }, []);

  // Fetch all components
  const fetchComponents = useCallback(async () => {
    const { data } = await supabase
      .from('components')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setComponents(data.map(rowToComponent));
    setLoading(false);
  }, []);

  useEffect(() => {
    migrateLocalStorage().then(fetchComponents);
  }, [migrateLocalStorage, fetchComponents]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('components-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'components' }, () => {
        fetchComponents();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchComponents]);

  const addComponent = useCallback(async (component: Omit<ElectronicComponent, 'id' | 'createdAt' | 'updatedAt'>) => {
    const row = componentToRow(component);
    const { data } = await supabase.from('components').insert(row).select().single();
    if (data) {
      const newComp = rowToComponent(data);
      setComponents(prev => [newComp, ...prev]);
      return newComp;
    }
  }, []);

  const updateComponent = useCallback(async (id: string, updates: Partial<ElectronicComponent>) => {
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.value !== undefined) dbUpdates.value = updates.value || null;
    if (updates.package !== undefined) dbUpdates.package = updates.package;
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.minQuantity !== undefined) dbUpdates.min_quantity = updates.minQuantity ?? null;
    if (updates.location !== undefined) dbUpdates.location = updates.location || null;
    if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode || null;
    if (updates.datasheetUrl !== undefined) dbUpdates.datasheet_url = updates.datasheetUrl || null;
    if (updates.manufacturer !== undefined) dbUpdates.manufacturer = updates.manufacturer || null;
    if (updates.description !== undefined) dbUpdates.description = updates.description || null;

    await supabase.from('components').update(dbUpdates).eq('id', id);
    setComponents(prev =>
      prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)
    );
  }, []);

  const deleteComponent = useCallback(async (id: string) => {
    await supabase.from('components').delete().eq('id', id);
    setComponents(prev => prev.filter(c => c.id !== id));
  }, []);

  return { components, loading, addComponent, updateComponent, deleteComponent };
}

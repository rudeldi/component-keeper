import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabase-config';
import { ElectronicComponent, ComponentCategory } from '@/types/component';

export interface BomList {
  id: string;
  name: string;
  description?: string;
  version: string;
  schematicUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BomItem {
  id: string;
  bomId: string;
  componentId: string;
  quantity: number;
  referenceDesignator?: string;
  note?: string;
  createdAt: string;
  component?: ElectronicComponent;
}

function rowToBomList(row: any): BomList {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    version: row.version ?? 'v1.0',
    schematicUrl: row.schematic_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToBomItem(row: any): BomItem {
  const item: BomItem = {
    id: row.id,
    bomId: row.bom_id,
    componentId: row.component_id,
    quantity: row.quantity,
    referenceDesignator: row.reference_designator ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
  if (row.components) {
    item.component = {
      id: row.components.id,
      name: row.components.name,
      category: row.components.category as ComponentCategory,
      type: row.components.type,
      value: row.components.value ?? undefined,
      package: row.components.package,
      quantity: row.components.quantity,
      minQuantity: row.components.min_quantity ?? undefined,
      location: row.components.location ?? undefined,
      barcode: row.components.barcode ?? undefined,
      datasheetUrl: row.components.datasheet_url ?? undefined,
      manufacturer: row.components.manufacturer ?? undefined,
      description: row.components.description ?? undefined,
      createdAt: row.components.created_at,
      updatedAt: row.components.updated_at,
    };
  }
  return item;
}

export function useBomLists() {
  const [bomLists, setBomLists] = useState<BomList[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => getSupabaseClient(), []);

  const fetchLists = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from('bom_lists')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setBomLists(data.map(rowToBomList));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('bom-lists-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bom_lists' }, () => {
        fetchLists();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchLists]);

  const addBomList = useCallback(async (name: string, description?: string, version?: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('bom_lists')
      .insert({ name, description: description || null, version: version || 'v1.0' })
      .select()
      .single();
    if (data) {
      const newList = rowToBomList(data);
      setBomLists(prev => [newList, ...prev]);
      return newList;
    }
  }, [supabase]);

  const updateBomList = useCallback(async (id: string, updates: { name?: string; description?: string; version?: string; schematicUrl?: string | null }) => {
    if (!supabase) return;
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description || null;
    if (updates.version !== undefined) dbUpdates.version = updates.version;
    if (updates.schematicUrl !== undefined) dbUpdates.schematic_url = updates.schematicUrl;
    await supabase.from('bom_lists').update(dbUpdates).eq('id', id);
    setBomLists(prev => prev.map(b => b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b));
  }, [supabase]);

  const deleteBomList = useCallback(async (id: string) => {
    if (!supabase) return;
    await supabase.from('bom_lists').delete().eq('id', id);
    setBomLists(prev => prev.filter(b => b.id !== id));
  }, [supabase]);

  const duplicateBomList = useCallback(async (id: string, newVersion: string) => {
    if (!supabase) return;
    const source = bomLists.find(b => b.id === id);
    if (!source) return;
    const { data: newListData } = await supabase
      .from('bom_lists')
      .insert({ name: source.name, description: source.description || null, version: newVersion })
      .select()
      .single();
    if (!newListData) return;
    const { data: sourceItems } = await supabase
      .from('bom_items')
      .select('*')
      .eq('bom_id', id);
    if (sourceItems && sourceItems.length > 0) {
      const newItems = sourceItems.map(item => ({
        bom_id: newListData.id,
        component_id: item.component_id,
        quantity: item.quantity,
        reference_designator: item.reference_designator,
        note: item.note,
      }));
      await supabase.from('bom_items').insert(newItems);
    }
    const newList = rowToBomList(newListData);
    setBomLists(prev => [newList, ...prev]);
    return newList;
  }, [supabase, bomLists]);

  return { bomLists, loading, addBomList, updateBomList, deleteBomList, duplicateBomList };
}

export function useBomItems(bomId: string | null) {
  const [items, setItems] = useState<BomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => getSupabaseClient(), []);

  const fetchItems = useCallback(async () => {
    if (!bomId || !supabase) { setItems([]); setLoading(false); return; }
    const { data } = await supabase
      .from('bom_items')
      .select('*, components(*)')
      .eq('bom_id', bomId)
      .order('created_at', { ascending: true });
    if (data) setItems(data.map(rowToBomItem));
    setLoading(false);
  }, [bomId, supabase]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!bomId || !supabase) return;
    const channel = supabase
      .channel(`bom-items-${bomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bom_items', filter: `bom_id=eq.${bomId}` }, () => {
        fetchItems();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bomId, supabase, fetchItems]);

  const addItem = useCallback(async (componentId: string, quantity: number, referenceDesignator?: string, note?: string) => {
    if (!bomId || !supabase) return;
    const { data } = await supabase
      .from('bom_items')
      .insert({
        bom_id: bomId,
        component_id: componentId,
        quantity,
        reference_designator: referenceDesignator || null,
        note: note || null,
      })
      .select('*, components(*)')
      .single();
    if (data) {
      setItems(prev => [...prev, rowToBomItem(data)]);
    }
  }, [bomId, supabase]);

  const updateItem = useCallback(async (id: string, updates: { quantity?: number; referenceDesignator?: string; note?: string }) => {
    if (!supabase) return;
    const dbUpdates: Record<string, any> = {};
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.referenceDesignator !== undefined) dbUpdates.reference_designator = updates.referenceDesignator || null;
    if (updates.note !== undefined) dbUpdates.note = updates.note || null;
    await supabase.from('bom_items').update(dbUpdates).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  }, [supabase]);

  const removeItem = useCallback(async (id: string) => {
    if (!supabase) return;
    await supabase.from('bom_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  }, [supabase]);

  return { items, loading, addItem, updateItem, removeItem, refetch: fetchItems };
}

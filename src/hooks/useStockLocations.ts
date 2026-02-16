import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabase-config';

export interface StockLocation {
  id: string;
  component_id: string;
  location: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  component_id: string;
  stock_location_id: string | null;
  quantity_change: number;
  movement_type: string;
  note: string | null;
  created_at: string;
}

export function useStockLocations(componentId: string | null) {
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => getSupabaseClient(), []);

  const fetchLocations = useCallback(async () => {
    if (!componentId || !supabase) return;
    const { data } = await supabase
      .from('stock_locations')
      .select('*')
      .eq('component_id', componentId)
      .order('created_at', { ascending: true });
    if (data) setLocations(data as StockLocation[]);
  }, [componentId, supabase]);

  const fetchMovements = useCallback(async () => {
    if (!componentId || !supabase) return;
    const { data } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('component_id', componentId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setMovements(data as StockMovement[]);
  }, [componentId, supabase]);

  useEffect(() => {
    if (!componentId) { setLocations([]); setMovements([]); setLoading(false); return; }
    setLoading(true);
    Promise.all([fetchLocations(), fetchMovements()]).then(() => setLoading(false));
  }, [componentId, fetchLocations, fetchMovements]);

  // Realtime
  useEffect(() => {
    if (!componentId || !supabase) return;
    const channel = supabase
      .channel(`stock-${componentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_locations', filter: `component_id=eq.${componentId}` }, () => fetchLocations())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements', filter: `component_id=eq.${componentId}` }, () => fetchMovements())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [componentId, supabase, fetchLocations, fetchMovements]);

  const addLocation = useCallback(async (location: string, quantity: number) => {
    if (!componentId || !supabase) return;
    const { data } = await supabase
      .from('stock_locations')
      .insert({ component_id: componentId, location, quantity })
      .select()
      .single();
    if (data) {
      await supabase.from('stock_movements').insert({
        component_id: componentId,
        stock_location_id: data.id,
        quantity_change: quantity,
        movement_type: 'initial',
        note: `Lagerort "${location}" angelegt`,
      });
    }
  }, [componentId, supabase]);

  const removeLocation = useCallback(async (locationId: string) => {
    if (!supabase) return;
    await supabase.from('stock_locations').delete().eq('id', locationId);
  }, [supabase]);

  const bookStock = useCallback(async (locationId: string, change: number, note?: string) => {
    if (!componentId || !supabase) return;
    const loc = locations.find(l => l.id === locationId);
    if (!loc) return;
    const newQty = Math.max(0, loc.quantity + change);
    await supabase.from('stock_locations').update({ quantity: newQty }).eq('id', locationId);
    await supabase.from('stock_movements').insert({
      component_id: componentId,
      stock_location_id: locationId,
      quantity_change: change,
      movement_type: change > 0 ? 'in' : 'out',
      note: note || null,
    });
  }, [componentId, supabase, locations]);

  return { locations, movements, loading, addLocation, removeLocation, bookStock };
}

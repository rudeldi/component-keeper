
-- Table for multiple stock locations per component
CREATE TABLE public.stock_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  location TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for stock movement history
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  stock_location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  quantity_change INTEGER NOT NULL,
  movement_type TEXT NOT NULL DEFAULT 'adjustment',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Public access policies (matching existing pattern - no auth)
CREATE POLICY "Public read stock_locations" ON public.stock_locations FOR SELECT USING (true);
CREATE POLICY "Public insert stock_locations" ON public.stock_locations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update stock_locations" ON public.stock_locations FOR UPDATE USING (true);
CREATE POLICY "Public delete stock_locations" ON public.stock_locations FOR DELETE USING (true);

CREATE POLICY "Public read stock_movements" ON public.stock_movements FOR SELECT USING (true);
CREATE POLICY "Public insert stock_movements" ON public.stock_movements FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete stock_movements" ON public.stock_movements FOR DELETE USING (true);

-- Trigger to update component total quantity when stock_locations change
CREATE OR REPLACE FUNCTION public.sync_component_quantity()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
DECLARE
  target_component_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_component_id := OLD.component_id;
  ELSE
    target_component_id := NEW.component_id;
  END IF;
  
  UPDATE public.components
  SET quantity = COALESCE((
    SELECT SUM(quantity) FROM public.stock_locations WHERE component_id = target_component_id
  ), 0)
  WHERE id = target_component_id;
  
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_quantity_on_stock_change
AFTER INSERT OR UPDATE OR DELETE ON public.stock_locations
FOR EACH ROW EXECUTE FUNCTION public.sync_component_quantity();

-- Trigger to update updated_at on stock_locations
CREATE TRIGGER update_stock_locations_updated_at
BEFORE UPDATE ON public.stock_locations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;

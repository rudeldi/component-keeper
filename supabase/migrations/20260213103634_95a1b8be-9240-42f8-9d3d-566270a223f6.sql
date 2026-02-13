
-- BOM lists table
CREATE TABLE public.bom_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bom_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read bom_lists" ON public.bom_lists FOR SELECT USING (true);
CREATE POLICY "Public insert bom_lists" ON public.bom_lists FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update bom_lists" ON public.bom_lists FOR UPDATE USING (true);
CREATE POLICY "Public delete bom_lists" ON public.bom_lists FOR DELETE USING (true);

CREATE TRIGGER update_bom_lists_updated_at
  BEFORE UPDATE ON public.bom_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- BOM items table (links BOM to components with quantity)
CREATE TABLE public.bom_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bom_id UUID NOT NULL REFERENCES public.bom_lists(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  reference_designator TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read bom_items" ON public.bom_items FOR SELECT USING (true);
CREATE POLICY "Public insert bom_items" ON public.bom_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update bom_items" ON public.bom_items FOR UPDATE USING (true);
CREATE POLICY "Public delete bom_items" ON public.bom_items FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bom_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bom_items;

-- Index for fast lookups
CREATE INDEX idx_bom_items_bom_id ON public.bom_items(bom_id);
CREATE INDEX idx_bom_items_component_id ON public.bom_items(component_id);

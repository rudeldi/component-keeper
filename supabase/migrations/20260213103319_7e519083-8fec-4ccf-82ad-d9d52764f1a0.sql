
-- Create components table
CREATE TABLE public.components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  type TEXT NOT NULL DEFAULT '',
  value TEXT,
  package TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER,
  location TEXT,
  barcode TEXT,
  datasheet_url TEXT,
  manufacturer TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public access
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON public.components FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.components FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.components FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.components FOR DELETE USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_components_updated_at
  BEFORE UPDATE ON public.components
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

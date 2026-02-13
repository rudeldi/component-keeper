
CREATE TABLE public.production_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bom_id UUID NOT NULL REFERENCES public.bom_lists(id) ON DELETE CASCADE,
  bom_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.production_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read production_runs" ON public.production_runs FOR SELECT USING (true);
CREATE POLICY "Public insert production_runs" ON public.production_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete production_runs" ON public.production_runs FOR DELETE USING (true);

-- Add schematic_url column to bom_lists
ALTER TABLE public.bom_lists ADD COLUMN schematic_url text;

-- Create storage bucket for schematics
INSERT INTO storage.buckets (id, name, public) VALUES ('schematics', 'schematics', true);

-- Storage policies for schematics bucket
CREATE POLICY "Public read schematics" ON storage.objects FOR SELECT USING (bucket_id = 'schematics');
CREATE POLICY "Public insert schematics" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'schematics');
CREATE POLICY "Public update schematics" ON storage.objects FOR UPDATE USING (bucket_id = 'schematics');
CREATE POLICY "Public delete schematics" ON storage.objects FOR DELETE USING (bucket_id = 'schematics');
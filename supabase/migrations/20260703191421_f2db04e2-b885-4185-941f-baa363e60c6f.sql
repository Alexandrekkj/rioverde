
CREATE POLICY "cliente-midias public read" ON storage.objects FOR SELECT USING (bucket_id = 'cliente-midias');
CREATE POLICY "cliente-midias public insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cliente-midias');
CREATE POLICY "cliente-midias public update" ON storage.objects FOR UPDATE USING (bucket_id = 'cliente-midias');
CREATE POLICY "cliente-midias public delete" ON storage.objects FOR DELETE USING (bucket_id = 'cliente-midias');

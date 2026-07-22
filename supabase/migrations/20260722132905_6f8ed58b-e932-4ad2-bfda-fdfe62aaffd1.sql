
DROP POLICY IF EXISTS "Public can view cliente-midias" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload cliente-midias" ON storage.objects;
DROP POLICY IF EXISTS "Public can update cliente-midias" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete cliente-midias" ON storage.objects;
DROP POLICY IF EXISTS "Public read cliente-midias" ON storage.objects;
DROP POLICY IF EXISTS "Public insert cliente-midias" ON storage.objects;
DROP POLICY IF EXISTS "Public update cliente-midias" ON storage.objects;
DROP POLICY IF EXISTS "Public delete cliente-midias" ON storage.objects;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND (qual LIKE '%cliente-midias%' OR with_check LIKE '%cliente-midias%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "cliente-midias read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cliente-midias');

CREATE POLICY "cliente-midias insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cliente-midias'
    AND (lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','gif','heic','mp4','mov','webm'))
    AND coalesce((metadata->>'size')::bigint, 0) <= 26214400
  );

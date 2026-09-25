-- Private Storage bucket for the Document Vault (Flow 3.12, screen 7e). Path
-- convention: {parent_id}/{child_id}/{doc_id} — storage.foldername(name)[1] is
-- the parent_id segment, so every policy below reduces to "you can only touch
-- your own folder." Reads are always short-lived signed URLs from server code,
-- never a public/anon-readable object.

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "documents_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "documents_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "documents_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- No UPDATE policy — replacing a document means deleting and re-uploading under a
-- new doc_id, not overwriting bytes in place.

-- Private Storage bucket for claim evidence (letter-on-letterhead uploads, Flow
-- 4.13 / design 18a's "letter" method). Path convention: {user_id}/{claim_id}/
-- {filename} — same shape as the documents bucket. Unlike documents, staff also
-- need read access here to actually review the evidence.

INSERT INTO storage.buckets (id, name, public)
VALUES ('school-claims', 'school-claims', false)
ON CONFLICT (id) DO NOTHING;

create policy "school_claims_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'school-claims' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "school_claims_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'school-claims' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "school_claims_staff_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'school-claims' and is_staff());

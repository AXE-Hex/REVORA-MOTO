-- Catalog images are public assets. Customer service evidence remains private.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('catalog-media','catalog-media',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=8388608,
  allowed_mime_types=array['image/jpeg','image/png','image/webp'];

create policy catalog_media_public_read on storage.objects for select to anon,authenticated
using (bucket_id='catalog-media');

create or replace function public.valid_catalog_image_object(p_name text,p_metadata jsonb)
returns boolean language sql immutable set search_path='' as $$
  select p_name ~ '^(products|motorcycles|variants)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
    and coalesce((p_metadata->>'size')::bigint,0) between 1 and 8388608
    and (
      (p_name ~ '\.jpg$' and p_metadata->>'mimetype'='image/jpeg')
      or (p_name ~ '\.png$' and p_metadata->>'mimetype'='image/png')
      or (p_name ~ '\.webp$' and p_metadata->>'mimetype'='image/webp')
    );
$$;
revoke all on function public.valid_catalog_image_object(text,jsonb) from public;
grant execute on function public.valid_catalog_image_object(text,jsonb) to authenticated;

create policy catalog_product_media_insert on storage.objects for insert to authenticated
with check (
  bucket_id='catalog-media'
  and public.valid_catalog_image_object(name,metadata)
  and (storage.foldername(name))[1]='products'
  and public.has_permission('catalog.write')
  and exists(select 1 from public.products p where p.id::text=(storage.foldername(name))[2])
);
create policy catalog_variant_media_insert on storage.objects for insert to authenticated
with check (
  bucket_id='catalog-media'
  and public.valid_catalog_image_object(name,metadata)
  and (storage.foldername(name))[1]='variants'
  and public.has_permission('catalog.write')
  and exists(select 1 from public.product_variants v where v.id::text=(storage.foldername(name))[2])
);
create policy catalog_motorcycle_media_insert on storage.objects for insert to authenticated
with check (
  bucket_id='catalog-media'
  and public.valid_catalog_image_object(name,metadata)
  and (storage.foldername(name))[1]='motorcycles'
  and public.has_permission('motorcycles.write')
  and exists(select 1 from public.motorcycles m where m.id::text=(storage.foldername(name))[2])
);

create policy catalog_media_staff_delete on storage.objects for delete to authenticated
using (
  bucket_id='catalog-media'
  and (
    ((storage.foldername(name))[1]='products' and public.has_permission('catalog.write'))
    or ((storage.foldername(name))[1]='variants' and public.has_permission('catalog.write'))
    or ((storage.foldername(name))[1]='motorcycles' and public.has_permission('motorcycles.write'))
  )
);

-- Owners may remove a failed, unregistered upload. Registered evidence is immutable.
drop policy if exists case_evidence_insert on storage.objects;
create policy case_evidence_insert on storage.objects for insert to authenticated with check (
  bucket_id='case-evidence'
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(returns|claims)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  and coalesce((metadata->>'size')::bigint,0) between 1 and 5242880
  and (
    (name ~ '\.jpg$' and metadata->>'mimetype'='image/jpeg')
    or (name ~ '\.png$' and metadata->>'mimetype'='image/png')
    or (name ~ '\.webp$' and metadata->>'mimetype'='image/webp')
  )
  and (storage.foldername(name))[1]=auth.uid()::text
  and (
    ((storage.foldername(name))[2]='returns'
      and exists(select 1 from public.return_requests r
        where r.id::text=(storage.foldername(name))[3] and r.user_id=auth.uid()))
    or ((storage.foldername(name))[2]='claims'
      and exists(select 1 from public.warranty_claims c
        where c.id::text=(storage.foldername(name))[3] and c.user_id=auth.uid()))
  )
);

create policy case_evidence_failed_upload_delete on storage.objects for delete to authenticated
using (
  bucket_id='case-evidence'
  and (storage.foldername(name))[1]=auth.uid()::text
  and not exists(select 1 from public.case_attachments a where a.storage_path=name)
);

create or replace function public.verify_case_attachment_object()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_object storage.objects%rowtype;
begin
  select * into v_object from storage.objects
  where bucket_id='case-evidence' and name=new.storage_path;
  if not found then raise exception 'Upload required'; end if;
  if coalesce(v_object.metadata->>'mimetype','')<>new.mime_type
     or coalesce((v_object.metadata->>'size')::bigint,-1)<>new.size_bytes then
    raise exception 'Attachment metadata mismatch';
  end if;
  if not (
    (new.mime_type='image/jpeg' and new.storage_path ~ '\.jpe?g$')
    or (new.mime_type='image/png' and new.storage_path ~ '\.png$')
    or (new.mime_type='image/webp' and new.storage_path ~ '\.webp$')
  ) then raise exception 'Attachment extension mismatch'; end if;
  return new;
end$$;
revoke all on function public.verify_case_attachment_object() from public;
create trigger verify_case_attachment_before_insert before insert on public.case_attachments
for each row execute function public.verify_case_attachment_object();

begin;

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
('1b1b1b1b-1b1b-41b1-81b1-1b1b1b1b1b1b','00000000-0000-0000-0000-000000000000','authenticated','authenticated','media-staff@example.test','',now(),now(),now()),
('2b2b2b2b-2b2b-42b2-82b2-2b2b2b2b2b2b','00000000-0000-0000-0000-000000000000','authenticated','authenticated','media-customer@example.test','',now(),now(),now());
insert into public.staff_roles(user_id,role_id)
values('1b1b1b1b-1b1b-41b1-81b1-1b1b1b1b1b1b','admin');

select id as product_id from public.products where sku='HLM-001' \gset
insert into storage.objects(bucket_id,name,metadata)
values
('catalog-media','products/'||:'product_id'||'/3b3b3b3b-3b3b-43b3-83b3-3b3b3b3b3b3b.jpg','{"mimetype":"image/jpeg","size":12}'),
('case-evidence','2b2b2b2b-2b2b-42b2-82b2-2b2b2b2b2b2b/returns/4b4b4b4b-4b4b-44b4-84b4-4b4b4b4b4b4b/5b5b5b5b-5b5b-45b5-85b5-5b5b5b5b5b5b.jpg','{"mimetype":"image/jpeg","size":12}');

set local role anon;
do $$begin
  if (select count(*) from storage.objects where bucket_id='catalog-media')<>1 then
    raise exception 'Public catalog image hidden';
  end if;
  if (select count(*) from storage.objects where bucket_id='case-evidence')<>0 then
    raise exception 'Private evidence exposed anonymously';
  end if;
end$$;

set local role authenticated;
select set_config('request.jwt.claim.sub','2b2b2b2b-2b2b-42b2-82b2-2b2b2b2b2b2b',true);
do $$declare v_product uuid;
begin
  select id into v_product from public.products where sku='HLM-001';
  begin
    insert into storage.objects(bucket_id,name,metadata)
    values('catalog-media','products/'||v_product||'/6b6b6b6b-6b6b-46b6-86b6-6b6b6b6b6b6b.jpg','{"mimetype":"image/jpeg","size":12}');
    raise exception 'Customer uploaded catalog media';
  exception when insufficient_privilege then null;
  end;
end$$;

select set_config('request.jwt.claim.sub','1b1b1b1b-1b1b-41b1-81b1-1b1b1b1b1b1b',true);
insert into storage.objects(bucket_id,name,metadata)
values('catalog-media','products/'||:'product_id'||'/7b7b7b7b-7b7b-47b7-87b7-7b7b7b7b7b7b.jpg','{"mimetype":"image/jpeg","size":12}');
do $$declare v_product uuid;
begin
  select id into v_product from public.products where sku='HLM-001';
  begin
    insert into storage.objects(bucket_id,name,metadata)
    values('catalog-media','products/'||v_product||'/8b8b8b8b-8b8b-48b8-88b8-8b8b8b8b8b8b.jpg','{"mimetype":"image/png","size":12}');
    raise exception 'Storage accepted mismatched extension and MIME';
  exception when insufficient_privilege then null;
  end;
  if (select count(*) from storage.objects where bucket_id='catalog-media')<>2 then
    raise exception 'Authorized staff could not upload catalog media';
  end if;
  if not exists(select 1 from pg_trigger
      where tgrelid='public.case_attachments'::regclass
        and tgname='verify_case_attachment_before_insert') then
    raise exception 'Evidence object metadata trigger missing';
  end if;
end$$;
rollback;

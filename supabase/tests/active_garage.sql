begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
('31111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','garage-one@example.com','',now(),now(),now()),
('32222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','garage-two@example.com','',now(),now(),now());
insert into public.garage_motorcycles(id,user_id,variant_id,year)
select '33333333-3333-4333-8333-333333333331','31111111-1111-4111-8111-111111111111',id,2026
from public.motorcycle_variants order by id limit 1;
insert into public.garage_motorcycles(id,user_id,variant_id,year)
select '33333333-3333-4333-8333-333333333332','31111111-1111-4111-8111-111111111111',id,2026
from public.motorcycle_variants order by id offset 1 limit 1;
insert into public.garage_motorcycles(id,user_id,variant_id,year)
select '33333333-3333-4333-8333-333333333333','32222222-2222-4222-8222-222222222222',id,2026
from public.motorcycle_variants order by id limit 1;
set local role authenticated;
select set_config('request.jwt.claim.sub','31111111-1111-4111-8111-111111111111',true);
select public.set_active_garage('33333333-3333-4333-8333-333333333331');
select public.set_active_garage('33333333-3333-4333-8333-333333333332');
do $$begin
  if (select count(*) from public.garage_motorcycles where user_id=auth.uid() and active)<>1 then
    raise exception 'Active garage uniqueness failed';
  end if;
  if not (select active from public.garage_motorcycles where id='33333333-3333-4333-8333-333333333332') then
    raise exception 'New active motorcycle was not saved';
  end if;
  begin
    perform public.set_active_garage('33333333-3333-4333-8333-333333333333');
    raise exception 'Other customer garage accepted';
  exception when raise_exception then
    if sqlerrm<>'Garage motorcycle not found' then raise; end if;
  end;
end$$;
rollback;

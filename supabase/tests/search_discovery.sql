begin;
do $$begin
  if has_table_privilege('anon','public.search_terms','SELECT') then raise exception 'Anonymous search table access';end if;
  if has_table_privilege('authenticated','public.search_term_daily','SELECT') then raise exception 'Customer search activity exposed';end if;
end$$;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('a4111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','search-a@example.test','',now(),now(),now()),
('a4222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','search-b@example.test','',now(),now(),now()),
('a4333333-3333-4333-8333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','search-c@example.test','',now(),now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','a4111111-1111-4111-8111-111111111111',true);
select public.record_search_term('  HELMET   ');
select public.record_search_term('helmet');
select public.record_search_term('x');
select public.record_search_term('خوذة دراجة');
select public.record_search_term('خوذة ١٢٣');
select public.record_search_term('خوذة!');
select public.record_search_term(repeat('a',81));
do $$begin
  begin perform * from public.search_terms; raise exception 'Customer read private search table';
  exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
  if (select count(*) from public.search_term_daily where user_id='a4111111-1111-4111-8111-111111111111')<>3 then raise exception 'Search duplicate not rate-limited or Arabic/Arabic-Indic term rejected';end if;
  if (select searches from public.search_terms where term='helmet')<>1 then raise exception 'Search aggregation incorrect';end if;
  if (select searches from public.search_terms where term='خوذة دراجة')<>1 then raise exception 'Arabic search aggregation incorrect';end if;
  if (select searches from public.search_terms where term='خوذة ١٢٣')<>1 then raise exception 'Arabic-Indic digit search aggregation incorrect';end if;
  if exists(select 1 from public.search_terms where term in ('خوذة!',repeat('a',81))) then raise exception 'Invalid search term accepted';end if;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','a4222222-2222-4222-8222-222222222222',true);
select public.record_search_term('helmet');
do $$begin
  if exists(select 1 from public.popular_search_terms() where term='helmet') then raise exception 'Search became popular below threshold';end if;
end$$;
select set_config('request.jwt.claim.sub','a4333333-3333-4333-8333-333333333333',true);
select public.record_search_term('helmet');
do $$begin
  if not exists(select 1 from public.popular_search_terms() where term='helmet' and searches=3) then raise exception 'Popular search missing';end if;
end$$;
do $$declare i int;begin
  for i in 1..40 loop perform public.record_search_term('unique term '||i);end loop;
end$$;
reset role;
do $$begin
  if (select count(*) from public.search_term_daily where user_id='a4333333-4333-4333-8333-333333333333' and searched_on=current_date)>30 then
    raise exception 'Per-customer daily search limit exceeded';end if;
end$$;
rollback;

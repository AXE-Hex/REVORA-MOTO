-- Search popularity is based on real signed-in searches, capped per user/day.
create table public.search_terms (
  term text primary key check(length(term) between 2 and 80),
  searches bigint not null default 0 check(searches>=0),
  last_searched_at timestamptz not null default now()
);
create table public.search_term_daily (
  user_id uuid not null references auth.users on delete cascade,
  term text not null references public.search_terms(term) on delete cascade,
  searched_on date not null default current_date,
  primary key(user_id,term,searched_on)
);
create index search_term_daily_age_idx on public.search_term_daily(searched_on);
alter table public.search_terms enable row level security;
alter table public.search_term_daily enable row level security;
revoke all on public.search_terms,public.search_term_daily from anon,authenticated;

create function public.record_search_term(p_term text) returns void
language plpgsql security definer set search_path=public as $$
declare v_term text;v_rows int;
begin
  if auth.uid() is null then return;end if;
  v_term:=lower(regexp_replace(trim(coalesce(p_term,'')),'[[:space:]]+',' ','g'));
  if length(v_term) not between 2 and 80 or v_term !~ '^[[:alnum:] -]+$' then return;end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  if (select count(*) from public.search_term_daily where user_id=auth.uid() and searched_on=current_date)>=30
    then return;end if;
  insert into public.search_terms(term) values(v_term) on conflict(term) do nothing;
  insert into public.search_term_daily(user_id,term) values(auth.uid(),v_term)
    on conflict do nothing;
  get diagnostics v_rows=row_count;
  if v_rows>0 then
    update public.search_terms set searches=searches+1,last_searched_at=now() where term=v_term;
  end if;
end$$;
revoke all on function public.record_search_term(text) from public,anon;
grant execute on function public.record_search_term(text) to authenticated;

create function public.popular_search_terms() returns table(term text,searches bigint)
language plpgsql stable security definer set search_path=public as $$
begin
  return query select s.term,s.searches from public.search_terms s
    where s.searches>=3 order by s.searches desc,s.last_searched_at desc limit 8;
end$$;
revoke all on function public.popular_search_terms() from public;
grant execute on function public.popular_search_terms() to anon,authenticated;

create function public.purge_search_term_daily() returns integer
language plpgsql security definer set search_path=public as $$
declare v_count int;
begin
  delete from public.search_term_daily where searched_on<current_date-30;
  get diagnostics v_count=row_count;
  return v_count;
end$$;
revoke all on function public.purge_search_term_daily() from public,anon,authenticated;
grant execute on function public.purge_search_term_daily() to service_role;

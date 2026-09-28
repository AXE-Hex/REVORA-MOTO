begin;
do $$begin
  if has_function_privilege('authenticated','public.claim_notification_emails(integer)','EXECUTE') then
    raise exception 'Customer can claim email addresses';
  end if;
  if has_function_privilege('authenticated','public.finish_notification_email(uuid,uuid,boolean,text,text)','EXECUTE') then
    raise exception 'Customer can acknowledge email delivery';
  end if;
end$$;

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values('8c8c8c8c-8c8c-48c8-88c8-8c8c8c8c8c8c','00000000-0000-0000-0000-000000000000',
       'authenticated','authenticated','email-recipient@example.test','',now(),now(),now());
insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en)
values('8c8c8c8c-8c8c-48c8-88c8-8c8c8c8c8c8c','عنوان','Title','النص','Body');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select outbox_id,claim_token,recipient_email
from public.claim_notification_emails(1) \gset
select set_config('test.email_id',:'outbox_id',true);
select set_config('test.old_token',:'claim_token',true);
do $$begin
  if (select status from public.email_outbox where id=current_setting('test.email_id',true)::uuid)<>'processing' then
    raise exception 'Email was not claimed';
  end if;
end$$;
select public.finish_notification_email(:'outbox_id',:'claim_token',false,null,'Temporary failure');
do $$begin
  if not exists(select 1 from public.email_outbox
      where id=current_setting('test.email_id')::uuid and status='failed'
        and attempts=1 and available_at>now()) then
    raise exception 'Failed email was not scheduled for retry';
  end if;
end$$;

update public.email_outbox set available_at=now()-interval '1 second'
where id=:'outbox_id';
select claim_token as second_token from public.claim_notification_emails(1) \gset
do $$begin
  begin
    perform public.finish_notification_email(
      current_setting('test.email_id')::uuid,
      current_setting('test.old_token')::uuid,true,'provider-1',null);
    raise exception 'Stale email claim accepted';
  exception when raise_exception then
    if sqlerrm<>'Stale email claim' then raise; end if;
  end;
end$$;
select public.finish_notification_email(:'outbox_id',:'second_token',true,'provider-2',null);
do $$begin
  if not exists(select 1 from public.email_outbox
      where id=current_setting('test.email_id')::uuid and status='sent'
        and attempts=2 and provider_message_id='provider-2' and sent_at is not null) then
    raise exception 'Email delivery was not recorded';
  end if;
end$$;
rollback;

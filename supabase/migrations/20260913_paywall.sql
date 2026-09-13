-- Run after schema.sql. Existing conversations remain free until their owner sets a boundary.
begin;
alter table public.conversations add column if not exists free_message_count integer;
alter table public.conversations add column if not exists total_message_count integer;
create table if not exists public.conversation_paid_content (
 conversation_id uuid primary key references public.conversations on delete cascade,
 messages jsonb not null
);
alter table public.conversation_paid_content enable row level security;
drop policy if exists paid_content_owner on public.conversation_paid_content;
create policy paid_content_owner on public.conversation_paid_content for select to authenticated using (
 exists(select 1 from public.conversations c where c.id=conversation_id and c.user_id=auth.uid())
);
revoke all on public.conversation_paid_content from anon,authenticated;
grant select on public.conversation_paid_content to authenticated;
-- Body changes must preserve the private copy and public preview atomically.
revoke update(messages) on public.conversations from authenticated;
create or replace function public.set_conversation_paywall(p_id uuid,p_free_count integer)
returns void language plpgsql security definer set search_path='' as $$
declare c public.conversations; full_body jsonb; preview_body jsonb; n integer;
begin
 select * into c from public.conversations where id=p_id for update;
 if auth.uid() is null or c.user_id is distinct from auth.uid() then raise exception 'Not authorized'; end if;
 select messages into full_body from public.conversation_paid_content where conversation_id=p_id;
 full_body:=coalesce(full_body,c.messages); n:=jsonb_array_length(full_body);
 if p_free_count is not null and (p_free_count<2 or p_free_count>=n) then raise exception 'Invalid boundary'; end if;
 if p_free_count is null then
  update public.conversations set messages=full_body,free_message_count=null,total_message_count=n where id=p_id;
  delete from public.conversation_paid_content where conversation_id=p_id;
 else
  insert into public.conversation_paid_content values(p_id,full_body) on conflict(conversation_id) do update set messages=excluded.messages;
  select jsonb_agg(value order by ordinality) into preview_body from jsonb_array_elements(full_body) with ordinality where ordinality<=p_free_count;
  update public.conversations set messages=preview_body,free_message_count=p_free_count,total_message_count=n where id=p_id;
 end if;
end $$;
revoke all on function public.set_conversation_paywall(uuid,integer) from public;
grant execute on function public.set_conversation_paywall(uuid,integer) to authenticated;
create or replace function public.create_paid_conversation(p_content jsonb,p_free_count integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
 if auth.uid() is null then raise exception 'Login required'; end if;
 insert into public.conversations(user_id,title,description,llm,messages,tags,summary,published,estimated_reading_minutes)
 values(auth.uid(),p_content->>'title',p_content->>'description',p_content->>'llm',p_content->'messages',
 array(select jsonb_array_elements_text(p_content->'tags')),array(select jsonb_array_elements_text(p_content->'summary')),
 (p_content->>'published')::boolean,(p_content->>'estimated_reading_minutes')::integer) returning id into new_id;
 perform public.set_conversation_paywall(new_id,p_free_count);
 return new_id;
end $$;
revoke all on function public.create_paid_conversation(jsonb,integer) from public;
grant execute on function public.create_paid_conversation(jsonb,integer) to authenticated;
commit;

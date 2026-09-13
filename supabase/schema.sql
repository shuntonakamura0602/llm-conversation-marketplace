-- Run once in the Supabase SQL Editor on a new project.
create table public.users (
 id uuid primary key references auth.users on delete cascade,
 username text not null unique check (username ~ '^[a-z0-9_-]{3,64}$'),
 display_name text not null check (char_length(display_name) between 1 and 50),
 bio text not null default '' check (char_length(bio)<=500),
 attributes text not null default '' check (char_length(attributes)<=150),
 avatar_url text, created_at timestamptz not null default now()
);
create table public.conversations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users on delete cascade,
 title text not null check (char_length(title) between 1 and 120), description text not null check (char_length(description) between 1 and 500),
 llm text not null check (llm in ('ChatGPT','Claude','Gemini','その他')),
 messages jsonb not null check (jsonb_typeof(messages)='array' and jsonb_array_length(messages)>=2 and octet_length(messages::text)<=500000),
 tags text[] not null default '{}' check (cardinality(tags)<=5), summary text[] not null default '{}' check (cardinality(summary)<=8),
 estimated_reading_minutes integer not null check (estimated_reading_minutes>0),
 published boolean not null default false, view_count integer not null default 0, created_at timestamptz not null default now()
);
create index conversations_published_date on public.conversations(created_at desc) where published;
create index conversations_author on public.conversations(user_id);
create table public.events (
 id bigint generated always as identity primary key, anonymous_id uuid not null, session_id uuid not null,
 user_id uuid references public.users on delete set null, conversation_id uuid references public.conversations on delete cascade,
 event_type text not null check(event_type in ('page_view','conversation_card_click','conversation_view','conversation_read_25','conversation_read_50','conversation_read_75','conversation_read_100','related_conversation_click','author_profile_click','feedback_click')),
 metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create index events_session on public.events(session_id,created_at);
create index events_visitor on public.events(anonymous_id,created_at);
create table public.reports (
 id bigint generated always as identity primary key, conversation_id uuid not null references public.conversations on delete cascade,
 user_id uuid references public.users on delete set null, reason text not null check(reason in ('個人情報','著作権','誹謗中傷','Spam','その他')),
 details text not null default '' check(char_length(details)<=2000), status text not null default 'open' check(status in ('open','resolved','dismissed')), created_at timestamptz not null default now()
);
alter table public.users enable row level security;
alter table public.conversations enable row level security;
alter table public.events enable row level security;
alter table public.reports enable row level security;
create policy "Public profiles" on public.users for select using(true);
create policy "Own profile" on public.users for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "Public or own conversations" on public.conversations for select using(published or user_id=auth.uid());
create policy "Own insert" on public.conversations for insert to authenticated with check(user_id=auth.uid());
create policy "Own update" on public.conversations for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "Own delete" on public.conversations for delete to authenticated using(user_id=auth.uid());
-- Events and reports are deliberately unreadable to visitors. Operators use SQL Editor.
revoke all on public.events, public.reports from anon,authenticated;
revoke all on public.users from anon,authenticated;
grant select on public.users to anon,authenticated;
grant update(display_name,bio,attributes) on public.users to authenticated;
revoke all on public.conversations from anon,authenticated;
grant select on public.conversations to anon,authenticated;
grant insert(user_id,title,description,llm,messages,tags,summary,estimated_reading_minutes,published) on public.conversations to authenticated;
grant update(title,description,llm,messages,tags,summary,estimated_reading_minutes,published) on public.conversations to authenticated;
grant delete on public.conversations to authenticated;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.users(id,username,display_name) values(new.id,'reader_'||replace(new.id::text,'-',''),'reader_'||left(new.id::text,6));
 return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
revoke all on function public.handle_new_user() from public;
create function public.record_event(p_anonymous_id uuid,p_session_id uuid,p_conversation_id uuid,p_event_type text,p_metadata jsonb default '{}') returns void language plpgsql security definer set search_path = '' as $$
begin
 if p_event_type not in ('page_view','conversation_card_click','conversation_view','conversation_read_25','conversation_read_50','conversation_read_75','conversation_read_100','related_conversation_click','author_profile_click','feedback_click') then raise exception 'Invalid event'; end if;
 if p_event_type <> 'page_view' and p_conversation_id is null then raise exception 'Conversation required'; end if;
 if p_conversation_id is not null and not exists(select 1 from public.conversations where id=p_conversation_id and published) then return; end if;
 if jsonb_typeof(p_metadata) <> 'object' or octet_length(p_metadata::text)>1000 then raise exception 'Invalid metadata'; end if;
 if p_event_type='feedback_click' and coalesce(p_metadata->>'feedback','') not in ('interesting','continue','more','pay_yes','pay_no') then raise exception 'Invalid feedback'; end if;
 -- One event of each kind per conversation/session, with separate feedback choices.
 perform pg_advisory_xact_lock(hashtextextended(p_session_id::text,0));
 if exists(select 1 from public.events where session_id=p_session_id and conversation_id is not distinct from p_conversation_id and event_type=p_event_type and metadata=p_metadata) then return; end if;
 if (select count(*) from public.events where anonymous_id=p_anonymous_id and created_at>now()-interval '1 minute')>=60 then return; end if;
 insert into public.events(anonymous_id,session_id,user_id,conversation_id,event_type,metadata) values(p_anonymous_id,p_session_id,auth.uid(),p_conversation_id,p_event_type,p_metadata);
 if p_event_type='conversation_view' then update public.conversations set view_count=view_count+1 where id=p_conversation_id; end if;
end; $$;
revoke all on function public.record_event(uuid,uuid,uuid,text,jsonb) from public;
grant execute on function public.record_event(uuid,uuid,uuid,text,jsonb) to anon,authenticated;
create function public.report_conversation(p_conversation_id uuid,p_reason text,p_details text default '') returns void language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.conversations where id=p_conversation_id and published) then raise exception 'Not found'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_conversation_id::text,1));
 if (select count(*) from public.reports where conversation_id=p_conversation_id and created_at>now()-interval '1 hour')>=20 then raise exception 'Try later'; end if;
 insert into public.reports(conversation_id,user_id,reason,details) values(p_conversation_id,auth.uid(),p_reason,p_details);
end; $$;
revoke all on function public.report_conversation(uuid,text,text) from public;
grant execute on function public.report_conversation(uuid,text,text) to anon,authenticated;
-- Validate direct API writes as well as server-action submissions.
create function public.validate_conversation() returns trigger language plpgsql set search_path = '' as $$
declare item jsonb; position integer := 0; expected_role text;
begin
 for item in select value from jsonb_array_elements(new.messages) loop
  expected_role := case when position % 2=0 then 'user' else 'assistant' end;
  if jsonb_typeof(item)<>'object' or item->>'role' is distinct from expected_role or jsonb_typeof(item->'content') is distinct from 'string' or length(trim(item->>'content'))=0 then raise exception 'Invalid message'; end if;
  position := position+1;
 end loop;
 if exists(select 1 from unnest(new.tags) t where t is null or char_length(t) not between 1 and 24) then raise exception 'Invalid tag'; end if;
 if exists(select 1 from unnest(new.summary) s where s is null or char_length(s) not between 1 and 200) then raise exception 'Invalid summary'; end if;
 return new;
end; $$;
create trigger validate_conversation before insert or update on public.conversations for each row execute function public.validate_conversation();

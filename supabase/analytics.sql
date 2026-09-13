-- Operator-only queries for Supabase SQL Editor. No public analytics endpoint.
-- Sessions end after 30 minutes of inactivity. Read progress is viewport exposure,
-- not proof of comprehension or dwell time. Exclude your own test traffic as needed.
with sessions as (
 select session_id, count(distinct conversation_id) filter(where event_type='conversation_view') as conversations
 from public.events group by session_id
)
select count(*) filter(where conversations>0) as reading_sessions,
 round(100.0*count(*) filter(where conversations>=2)/nullif(count(*) filter(where conversations>0),0),2) as conversation_to_conversation_percent,
 round(avg(conversations) filter(where conversations>0),2) as conversations_per_reading_session from sessions;

-- Homepage-session conversion (not impression CTR: individual card impressions are not tracked).
select round(100.0*count(distinct session_id) filter(where event_type='conversation_card_click')/
 nullif(count(distinct session_id) filter(where event_type='page_view'),0),2) as homepage_to_card_click_percent from public.events;

-- Read depth per conversation visit (including zero-progress visits).
with visits as (
 select session_id, conversation_id, max(case event_type when 'conversation_read_25' then 25 when 'conversation_read_50' then 50 when 'conversation_read_75' then 75 when 'conversation_read_100' then 100 else 0 end) as depth
 from public.events where conversation_id is not null group by session_id,conversation_id
 having bool_or(event_type='conversation_view')
) select round(avg(depth),2) as average_max_read_percent from visits;

with visitors as (select anonymous_id,count(distinct (created_at at time zone 'Asia/Tokyo')::date) as days from public.events group by anonymous_id)
select round(100.0*count(*) filter(where days>1)/nullif(count(*),0),2) as returning_visitor_percent from visitors;

select round(100.0*count(distinct (session_id,conversation_id)) filter(where event_type='feedback_click')/
 nullif(count(distinct (session_id,conversation_id)) filter(where event_type='conversation_view'),0),2) as feedback_percent from public.events;
select metadata->>'feedback' as feedback,count(*) from public.events where event_type='feedback_click' group by 1;
select * from public.reports where status='open' order by created_at desc;
-- Moderation: update public.conversations set published=false where id='UUID';
-- update public.reports set status='resolved' where id=REPORT_ID;

-- 기존 운영 DB에 추가 실행하는 마이그레이션입니다. schema.sql을 재실행하지 마세요.
begin;
create table if not exists public.personal_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 80),
  note text check (length(note) <= 2000),
  date date not null,
  end_date date not null,
  all_day boolean not null default true,
  start_time time not null default '00:00',
  end_time time not null default '23:59',
  created_at timestamptz not null default now(),
  check (end_date >= date),
  check (all_day or end_date > date or end_time > start_time)
);
create index if not exists personal_events_owner_dates on public.personal_events(owner_id, date, end_date);
alter table public.personal_events enable row level security;
drop policy if exists personal_events_read on public.personal_events;
create policy personal_events_read on public.personal_events for select to anon, authenticated using (true);
drop policy if exists personal_events_write on public.personal_events;
create policy personal_events_write on public.personal_events for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
grant select on public.personal_events to anon;
grant select, insert, update, delete on public.personal_events to authenticated;

-- KST 기준 [시작, 종료) 구간. 기존 날짜 단위 예약의 23:59는 자정까지로 해석.
create or replace function public.ccb_period(d date, ed date, st time, et time, whole boolean default false)
returns tsrange language sql immutable set search_path = pg_catalog, public, pg_temp as $$
  select tsrange(case when whole then d::timestamp else d + st end,
    case when whole or et = time '23:59' then (coalesce(ed,d) + 1)::timestamp else coalesce(ed,d) + et end, '[)');
$$;

-- 같은 관리자의 예약/개인 일정 변경을 직렬화. RLS 우회 경로도 DB에서 겹침 차단.
create or replace function public.ccb_guard_personal_event()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 28));
  if exists (select 1 from public.personal_events e where e.owner_id = new.owner_id and e.id <> new.id
    and public.ccb_period(e.date,e.end_date,e.start_time,e.end_time,e.all_day) && public.ccb_period(new.date,new.end_date,new.start_time,new.end_time,new.all_day)) then
    raise exception '다른 개인 일정과 겹쳐요. 시간을 조정해주세요.';
  end if;
  if exists (select 1 from public.bookings b join public.available_slots s on s.id=b.slot_id
    where s.owner_id=new.owner_id and b.status in ('pending','confirmed')
    and public.ccb_period(s.date,s.end_date,s.start_time,s.end_time) && public.ccb_period(new.date,new.end_date,new.start_time,new.end_time,new.all_day)) then
    raise exception '신청 또는 확정된 약속과 겹쳐요. 예약을 먼저 조정해주세요.';
  end if;
  return new;
end; $$;
drop trigger if exists ccb_personal_conflict on public.personal_events;
create trigger ccb_personal_conflict before insert or update on public.personal_events for each row execute function public.ccb_guard_personal_event();

create or replace function public.ccb_guard_booking_personal()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare s public.available_slots;
begin
  if new.status not in ('pending','confirmed') then return new; end if;
  select * into s from public.available_slots where id=new.slot_id;
  perform pg_advisory_xact_lock(hashtextextended(s.owner_id::text, 28));
  if exists (select 1 from public.personal_events e where e.owner_id=s.owner_id
    and public.ccb_period(e.date,e.end_date,e.start_time,e.end_time,e.all_day) && public.ccb_period(s.date,s.end_date,s.start_time,s.end_time)) then
    raise exception '이미 개인 일정이 있는 시간이에요. 다른 날짜를 선택해주세요.';
  end if;
  return new;
end; $$;
drop trigger if exists ccb_booking_personal_conflict on public.bookings;
create trigger ccb_booking_personal_conflict before insert or update on public.bookings for each row execute function public.ccb_guard_booking_personal();

-- 기존 슬롯 수정으로 확정 약속을 개인 일정 위로 이동하는 경로도 차단.
create or replace function public.ccb_guard_slot_personal()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 28));
  if exists (select 1 from public.bookings where slot_id=new.id and status in ('pending','confirmed'))
    and exists (select 1 from public.personal_events e where e.owner_id=new.owner_id
      and public.ccb_period(e.date,e.end_date,e.start_time,e.end_time,e.all_day) && public.ccb_period(new.date,new.end_date,new.start_time,new.end_time)) then
    raise exception '이미 개인 일정이 있는 시간이에요.';
  end if;
  return new;
end; $$;
drop trigger if exists ccb_slot_personal_conflict on public.available_slots;
create trigger ccb_slot_personal_conflict before update on public.available_slots for each row execute function public.ccb_guard_slot_personal();

-- 한 예약만 이동. 여러 예약이 같은 슬롯을 참조해도 다른 예약은 변하지 않습니다.
create or replace function public.ccb_admin_edit_booking(p_id uuid, p_fields jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare b public.bookings; s public.available_slots; target uuid; d date; ed date;
  st time; et time; nm text; ttl text; mt text; loc text; cnt integer;
begin
  select * into b from public.bookings where id=p_id for update;
  if not found then raise exception '예약을 찾을 수 없어요.'; end if;
  select * into s from public.available_slots where id=b.slot_id;
  if auth.uid() is null or s.owner_id <> auth.uid() then raise exception '수정 권한이 없어요.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(s.owner_id::text,28));
  if b.status not in ('pending','confirmed') then raise exception '취소된 예약은 수정할 수 없어요.'; end if;
  d := (p_fields->>'date')::date; ed := (p_fields->>'end_date')::date;
  -- 기존 예약 시간은 그대로 유지하고 날짜만 이동합니다.
  st := s.start_time; et := s.end_time;
  nm := trim(p_fields->>'guest_name'); ttl := trim(p_fields->>'booking_title');
  mt := trim(p_fields->>'meeting_type'); loc := trim(p_fields->>'location_text');
  cnt := (p_fields->>'guest_count')::integer;
  if d is null or ed is null or st is null or et is null or ed<d or (ed=d and et<=st)
    or d < (now() at time zone 'Asia/Seoul')::date
    or nm is null or length(nm) not between 1 and 20
    or ttl is null or length(ttl) not between 1 and 40
    or mt is null or length(mt) not between 1 and 50
    or loc is null or length(loc) not between 1 and 200
    or cnt is null or cnt not between 1 and 4
    or length(coalesce(p_fields->>'guest_contact',''))>100
    or length(coalesce(p_fields->>'note',''))>2000 then
    raise exception '입력값을 확인해주세요.';
  end if;
  if exists (select 1 from public.personal_events e where e.owner_id=s.owner_id
    and public.ccb_period(e.date,e.end_date,e.start_time,e.end_time,e.all_day) && public.ccb_period(d,ed,st,et)) then
    raise exception '개인 일정과 겹쳐요.';
  end if;
  if (d,ed,st,et) is distinct from (s.date,coalesce(s.end_date,s.date),s.start_time,s.end_time)
    and exists (select 1 from public.bookings ob join public.available_slots os on os.id=ob.slot_id
    where os.owner_id=s.owner_id and ob.id<>b.id and ob.status in ('pending','confirmed')
    and public.ccb_period(os.date,os.end_date,os.start_time,os.end_time) && public.ccb_period(d,ed,st,et)) then
    raise exception '다른 신청 또는 확정된 약속과 겹쳐요.';
  end if;
  target := s.id;
  if (d,ed,st,et,loc) is distinct from (s.date,coalesce(s.end_date,s.date),s.start_time,s.end_time,s.location_text) then
    insert into public.available_slots(owner_id,date,end_date,start_time,end_time,title,meeting_type,description,location_text,max_guests,is_active)
      values(s.owner_id,d,ed,st,et,ttl,mt,s.description,loc,1,true) returning id into target;
  end if;
  update public.bookings set slot_id=target,guest_name=nm,guest_contact=nullif(trim(p_fields->>'guest_contact'),''),
    booking_title=ttl,guest_count=cnt,meeting_type=mt,note=nullif(trim(p_fields->>'note'),'') where id=b.id returning * into b;
  if target<>s.id and not exists(select 1 from public.bookings where slot_id=s.id and status in ('pending','confirmed')) then
    update public.available_slots set is_active=false where id=s.id;
  end if;
  return to_jsonb(b) || jsonb_build_object('available_slots', (select to_jsonb(x) from
    (select date,end_date,start_time,end_time,title,location_text,meeting_type from public.available_slots where id=target) x));
end; $$;
revoke all on function public.ccb_admin_edit_booking(uuid,jsonb) from public,anon;
grant execute on function public.ccb_admin_edit_booking(uuid,jsonb) to authenticated;
commit;

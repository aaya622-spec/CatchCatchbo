begin;
create table if not exists public.appointment_invitations (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 40),
 note text check(length(note)<=2000),
 date date not null,
 end_date date not null check(end_date>=date),
 location_text text not null check(length(trim(location_text)) between 1 and 200),
 meeting_type text not null check(length(trim(meeting_type)) between 1 and 50),
 status text not null default 'pending' check(status in ('pending','confirmed','rejected','canceled')),
 booking_id uuid references public.bookings(id) on delete set null,
 calendar_error text,
 created_at timestamptz not null default now()
);
create table if not exists public.appointment_invitees (
 id uuid primary key default gen_random_uuid(),
 invitation_id uuid not null references public.appointment_invitations(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 20),
 token uuid not null unique default gen_random_uuid(),
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 responded_at timestamptz,
 position integer not null
);
create index if not exists ccb_invite_owner_dates on public.appointment_invitations(owner_id,date,end_date) where status='pending';
create index if not exists ccb_invitee_group on public.appointment_invitees(invitation_id);
alter table public.appointment_invitations enable row level security;
alter table public.appointment_invitees enable row level security;
drop policy if exists ccb_invite_owner_read on public.appointment_invitations;
create policy ccb_invite_owner_read on public.appointment_invitations for select to authenticated using(owner_id=auth.uid());
drop policy if exists ccb_invitee_owner_read on public.appointment_invitees;
create policy ccb_invitee_owner_read on public.appointment_invitees for select to authenticated using(exists(select 1 from public.appointment_invitations i where i.id=invitation_id and i.owner_id=auth.uid()));
revoke all on public.appointment_invitations,public.appointment_invitees from anon,authenticated;
grant select on public.appointment_invitations,public.appointment_invitees to authenticated;
grant all on public.appointment_invitations,public.appointment_invitees to service_role;
-- 공개 달력에는 초대 비밀 링크와 참석자 정보를 노출하지 않습니다.
create or replace view public.invitation_holds as
 select i.id,i.owner_id,i.title,i.note,coalesce(s.date,i.date) as date,
 coalesce(s.end_date,s.date,i.end_date) as end_date,i.status,b.slot_id
 from public.appointment_invitations i
 left join public.bookings b on b.id=i.booking_id
 left join public.available_slots s on s.id=b.slot_id
 where i.status='pending' or (i.status='confirmed' and b.status='confirmed');
revoke all on public.invitation_holds from public,anon,authenticated;
grant select on public.invitation_holds to anon,authenticated;

create or replace function public.ccb_invite_create(p jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare uid uuid:=auth.uid(); iid uuid; d date; ed date; n integer; names jsonb; title_text text; loc text; mt text;
begin
 if uid is null then raise exception '로그인이 필요해요.'; end if;
 d:=(p->>'date')::date; ed:=coalesce(nullif(p->>'end_date','')::date,d);
 names:=p->'names'; title_text:=trim(p->>'title');loc:=trim(p->>'location_text');mt:=trim(p->>'meeting_type');
 if d is null or ed<d or d<(now() at time zone 'Asia/Seoul')::date
  or title_text is null or length(title_text) not between 1 and 40
  or loc is null or length(loc) not between 1 and 200
  or mt is null or length(mt) not between 1 and 50
  or length(coalesce(p->>'note',''))>2000 or jsonb_typeof(names) is distinct from 'array' then
  raise exception '약속 제목·날짜·장소·참석자를 확인해주세요.';
 end if;
 n:=jsonb_array_length(names);
 if n not between 1 and 4 or exists(select 1 from jsonb_array_elements_text(names) x where length(trim(x)) not between 1 and 20)
 or (select count(distinct trim(x)) from jsonb_array_elements_text(names) x)<>n then
  raise exception '참석자는 중복 없이 1~4명, 이름은 20자 이내로 입력해주세요.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,28));
 if exists(select 1 from public.personal_events e where e.owner_id=uid and e.date<=ed and e.end_date>=d)
 or exists(select 1 from public.bookings b join public.available_slots s on s.id=b.slot_id where s.owner_id=uid and b.status in ('pending','confirmed') and s.date<=ed and coalesce(s.end_date,s.date)>=d)
 or exists(select 1 from public.appointment_invitations i where i.owner_id=uid and i.status='pending' and i.date<=ed and i.end_date>=d) then
  raise exception '이미 약속·신청·개인 일정 또는 응답 대기 중인 초대가 있어요.';
 end if;
 insert into public.appointment_invitations(owner_id,title,note,date,end_date,location_text,meeting_type)
 values(uid,title_text,nullif(trim(p->>'note'),''),d,ed,loc,mt) returning id into iid;
 insert into public.appointment_invitees(invitation_id,name,position)
 select iid,trim(value),ordinality::integer from jsonb_array_elements_text(names) with ordinality;
 return iid;
end;$$;
revoke all on function public.ccb_invite_create(jsonb) from public,anon;
grant execute on function public.ccb_invite_create(jsonb) to authenticated;

-- 초대 생성과 다른 예약/개인 일정 저장에 같은 관리자 잠금을 사용합니다.
create or replace function public.ccb_invite_hold_guard()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare uid uuid; d date; ed date; sid uuid;
begin
 if tg_table_name='bookings' then
  if new.status not in ('pending','confirmed') then return new;end if;
  sid:=new.slot_id;
  select owner_id,date,coalesce(end_date,date) into uid,d,ed from public.available_slots where id=new.slot_id;
 elsif tg_table_name='available_slots' then
  if not exists(select 1 from public.bookings where slot_id=new.id and status in ('pending','confirmed')) then return new;end if;
  sid:=new.id;uid:=new.owner_id;d:=new.date;ed:=coalesce(new.end_date,new.date);
 else
  uid:=new.owner_id;d:=new.date;ed:=new.end_date;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,28));
 if exists(select 1 from public.invitation_holds i where i.owner_id=uid and i.date<=ed and i.end_date>=d and (sid is null or i.slot_id is distinct from sid)) then
  raise exception '약속 초대의 응답을 기다리는 날짜예요. 다른 날짜를 선택해주세요.';
 end if;
 return new;
end;$$;
drop trigger if exists ccb_invitation_hold on public.bookings;
create trigger ccb_invitation_hold before insert or update on public.bookings for each row execute function public.ccb_invite_hold_guard();
drop trigger if exists ccb_invitation_hold on public.personal_events;
create trigger ccb_invitation_hold before insert or update on public.personal_events for each row execute function public.ccb_invite_hold_guard();
drop trigger if exists ccb_invitation_hold on public.available_slots;
create trigger ccb_invitation_hold before update on public.available_slots for each row execute function public.ccb_invite_hold_guard();

create or replace function public.ccb_invite_read(p_token uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.appointment_invitees; i public.appointment_invitations; b public.bookings; s public.available_slots;
begin
 select * into r from public.appointment_invitees where token=p_token;
 if not found then return null;end if;
 select * into i from public.appointment_invitations where id=r.invitation_id;
 if i.booking_id is not null then
  select * into b from public.bookings where id=i.booking_id;
  select * into s from public.available_slots where id=b.slot_id;
 end if;
 return jsonb_build_object('id',i.id,'status',case when b.status='canceled' then 'canceled' else i.status end,
 'title',coalesce(b.booking_title,i.title),'note',case when b.id is not null then b.note else i.note end,
 'date',coalesce(s.date,i.date),'end_date',coalesce(s.end_date,s.date,i.end_date),
 'location_text',coalesce(s.location_text,i.location_text),'own_name',r.name,'own_status',r.status,
 'participants',(select jsonb_agg(jsonb_build_object('name',name,'status',status) order by position) from public.appointment_invitees where invitation_id=i.id));
end;$$;
revoke all on function public.ccb_invite_read(uuid) from public,anon,authenticated;
grant execute on function public.ccb_invite_read(uuid) to service_role;

create or replace function public.ccb_invite_respond(p_token uuid,p_accept boolean)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.appointment_invitees; i public.appointment_invitations; sid uuid; bid uuid; cnt integer; nm text;
begin
 if p_accept is null then raise exception '응답을 선택해주세요.';end if;
 select * into r from public.appointment_invitees where token=p_token;
 if not found then raise exception '초대 링크를 찾을 수 없어요.';end if;
 select * into i from public.appointment_invitations where id=r.invitation_id for update;
 perform pg_advisory_xact_lock(hashtextextended(i.owner_id::text,28));
 select * into r from public.appointment_invitees where token=p_token;
 -- 같은 링크로 반복 응답해도 새 예약을 만들지 않습니다.
 if i.status<>'pending' or r.status<>'pending' then return public.ccb_invite_read(p_token);end if;
 if i.date<(now() at time zone 'Asia/Seoul')::date then
  update public.appointment_invitations set status='canceled' where id=i.id;
  return public.ccb_invite_read(p_token);
 end if;
 update public.appointment_invitees set status=case when p_accept then 'accepted' else 'declined' end,responded_at=now() where id=r.id;
 if not p_accept then
  update public.appointment_invitations set status='rejected' where id=i.id;
 elsif not exists(select 1 from public.appointment_invitees where invitation_id=i.id and status<>'accepted') then
  -- 마지막 수락과 예약 생성은 하나의 트랜잭션입니다.
  if exists(select 1 from public.personal_events e where e.owner_id=i.owner_id and e.date<=i.end_date and e.end_date>=i.date)
  or exists(select 1 from public.bookings b join public.available_slots s on s.id=b.slot_id where s.owner_id=i.owner_id and b.status in ('pending','confirmed') and s.date<=i.end_date and coalesce(s.end_date,s.date)>=i.date) then
   raise exception '다른 일정과 겹쳐 확정할 수 없어요. 보에게 알려주세요.';
  end if;
  update public.appointment_invitations set status='confirmed' where id=i.id;
  select count(*),left((array_agg(name order by position))[1],14) into cnt,nm from public.appointment_invitees where invitation_id=i.id;
  if cnt>1 then nm:=nm||' 외 '||(cnt-1)||'명';end if;
  insert into public.available_slots(owner_id,date,end_date,start_time,end_time,title,meeting_type,description,location_text,max_guests,is_active)
   values(i.owner_id,i.date,i.end_date,'00:00','23:59',i.title,i.meeting_type,i.note,i.location_text,1,true) returning id into sid;
  insert into public.bookings(slot_id,manage_token,guest_name,booking_title,guest_count,meeting_type,note,status)
   values(sid,gen_random_uuid(),nm,i.title,cnt,i.meeting_type,i.note,'confirmed') returning id into bid;
  update public.appointment_invitations set booking_id=bid where id=i.id;
 end if;
 return public.ccb_invite_read(p_token);
end;$$;
revoke all on function public.ccb_invite_respond(uuid,boolean) from public,anon,authenticated;
grant execute on function public.ccb_invite_respond(uuid,boolean) to service_role;

create or replace function public.ccb_invite_cancel(p_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare i public.appointment_invitations;
begin
 select * into i from public.appointment_invitations where id=p_id for update;
 if not found or auth.uid() is null or auth.uid()<>i.owner_id then raise exception '초대 취소 권한이 없어요.';end if;
 perform pg_advisory_xact_lock(hashtextextended(i.owner_id::text,28));
 if i.status<>'pending' then raise exception '이미 마감된 초대예요. 확정 약속은 예약 목록에서 취소해주세요.';end if;
 update public.appointment_invitations set status='canceled' where id=i.id;
end;$$;
revoke all on function public.ccb_invite_cancel(uuid) from public,anon;
grant execute on function public.ccb_invite_cancel(uuid) to authenticated;

create or replace function public.ccb_invite_booking_cancelled()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
 if new.status='canceled' and old.status is distinct from new.status then
  update public.appointment_invitations set status='canceled',calendar_error=null where booking_id=new.id;
 end if;
 return new;
end;$$;
drop trigger if exists ccb_invite_booking_cancelled on public.bookings;
create trigger ccb_invite_booking_cancelled after update on public.bookings for each row execute function public.ccb_invite_booking_cancelled();
commit;

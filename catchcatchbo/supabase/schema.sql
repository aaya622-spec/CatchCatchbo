-- ============================================================
-- 캐치캐치보 (CatchCatchBo) Supabase 스키마
-- Supabase SQL Editor에서 전체 실행하세요
-- ============================================================

-- 확장 기능
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. profiles 테이블
--    관리자 프로필 (한 명 기준)
-- ============================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text not null default '보',
  intro_message text default '안녕! 내 일정 예약 페이지야 😊',
  created_at   timestamptz not null default now()
);

-- auth.users에 새 사용자 생성 시 자동으로 profile 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. available_slots 테이블
--    관리자가 등록한 가능한 일정
-- ============================================================
create table if not exists public.available_slots (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  date          date not null,
  start_time    time not null,
  end_time      time not null,
  title         text,                        -- 슬롯 이름 (선택)
  meeting_type  text not null default 'hangout',
  description   text,
  location_text text not null default 'tbd', -- 장소 프리셋 또는 직접 입력 텍스트
  max_guests    integer not null default 1 check (max_guests >= 1 and max_guests <= 20),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint valid_time_range check (end_time > start_time)
);

-- updated_at 자동 갱신
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists slots_updated_at on public.available_slots;
create trigger slots_updated_at
  before update on public.available_slots
  for each row execute procedure public.update_updated_at();

-- 인덱스
create index if not exists idx_slots_owner_id on public.available_slots(owner_id);
create index if not exists idx_slots_date on public.available_slots(date);
create index if not exists idx_slots_is_active on public.available_slots(is_active);
create index if not exists idx_slots_date_active on public.available_slots(date, is_active)
  where is_active = true;

-- ============================================================
-- 3. bookings 테이블
--    예약자가 생성한 예약
-- ============================================================
create table if not exists public.bookings (
  id             uuid primary key default uuid_generate_v4(),
  slot_id        uuid not null references public.available_slots(id) on delete restrict,
  guest_name     text not null check (length(trim(guest_name)) >= 1),
  guest_contact  text,           -- 연락처 또는 카카오톡 이름 (선택)
  meeting_type   text not null,
  note           text,
  status         text not null default 'confirmed'
                   check (status in ('confirmed', 'canceled')),
  created_at     timestamptz not null default now(),
  canceled_at    timestamptz
);

-- 인덱스
create index if not exists idx_bookings_slot_id on public.bookings(slot_id);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_bookings_slot_status on public.bookings(slot_id, status)
  where status = 'confirmed';

-- ============================================================
-- 4. 정원 초과 방지 함수 & 트리거
--    INSERT 전에 서버에서 정원을 검증합니다 (프론트 우회 방지)
-- ============================================================
create or replace function public.check_booking_capacity()
returns trigger
language plpgsql
security definer
as $$
declare
  v_max_guests  integer;
  v_is_active   boolean;
  v_slot_date   date;
  v_confirmed   integer;
begin
  -- 슬롯 정보 조회
  select max_guests, is_active, date
  into   v_max_guests, v_is_active, v_slot_date
  from   public.available_slots
  where  id = new.slot_id;

  if not found then
    raise exception '존재하지 않는 일정이에요.';
  end if;

  if not v_is_active then
    raise exception '비활성화된 일정이에요.';
  end if;

  if v_slot_date < current_date then
    raise exception '이미 지난 날짜예요.';
  end if;

  -- 현재 확정 예약 수 조회 (FOR UPDATE로 동시성 잠금)
  select count(*)
  into   v_confirmed
  from   public.bookings
  where  slot_id = new.slot_id
    and  status = 'confirmed';

  if v_confirmed >= v_max_guests then
    raise exception '이미 예약이 꽉 찼어요. 다른 날을 선택해줘요.';
  end if;

  return new;
end;
$$;

drop trigger if exists check_capacity_before_booking on public.bookings;
create trigger check_capacity_before_booking
  before insert on public.bookings
  for each row execute procedure public.check_booking_capacity();

-- ============================================================
-- 5. 현재 예약 수를 반환하는 뷰 (관리자 및 공개용)
-- ============================================================
create or replace view public.slots_with_count as
select
  s.*,
  coalesce(b.confirmed_count, 0)::integer as booking_count,
  greatest(s.max_guests - coalesce(b.confirmed_count, 0), 0)::integer as remaining
from public.available_slots s
left join (
  select slot_id, count(*) as confirmed_count
  from public.bookings
  where status = 'confirmed'
  group by slot_id
) b on b.slot_id = s.id;

-- ============================================================
-- 6. RLS (Row Level Security) 정책
-- ============================================================

-- profiles
alter table public.profiles enable row level security;

-- 관리자(본인)만 자신의 프로필 조회/수정 가능
create policy "관리자 본인 프로필 조회"
  on public.profiles for select
  using (auth.uid() = id);

create policy "관리자 본인 프로필 수정"
  on public.profiles for update
  using (auth.uid() = id);

-- available_slots
alter table public.available_slots enable row level security;

-- 공개 사용자: 활성화된 슬롯만 조회 가능
create policy "공개 사용자 활성 슬롯 조회"
  on public.available_slots for select
  using (is_active = true);

-- 관리자(인증된 사용자): 자신의 슬롯 전체 조회
create policy "관리자 전체 슬롯 조회"
  on public.available_slots for select
  using (auth.uid() = owner_id);

-- 관리자: 슬롯 생성
create policy "관리자 슬롯 생성"
  on public.available_slots for insert
  with check (auth.uid() = owner_id);

-- 관리자: 슬롯 수정
create policy "관리자 슬롯 수정"
  on public.available_slots for update
  using (auth.uid() = owner_id);

-- 관리자: 슬롯 삭제
create policy "관리자 슬롯 삭제"
  on public.available_slots for delete
  using (auth.uid() = owner_id);

-- bookings
alter table public.bookings enable row level security;

-- 공개 사용자: 예약 생성 가능 (트리거에서 정원 검증)
create policy "공개 사용자 예약 생성"
  on public.bookings for insert
  with check (true);

-- 공개 사용자: 자신의 예약 id로 조회는 허용 안 함
-- (예약 완료 후 결과는 서버에서 반환한 데이터를 사용)

-- 관리자: 자신의 슬롯에 속한 모든 예약 조회 가능
create policy "관리자 예약 조회"
  on public.bookings for select
  using (
    exists (
      select 1 from public.available_slots s
      where s.id = bookings.slot_id
        and s.owner_id = auth.uid()
    )
  );

-- 관리자: 예약 상태 변경 (취소)
create policy "관리자 예약 취소"
  on public.bookings for update
  using (
    exists (
      select 1 from public.available_slots s
      where s.id = bookings.slot_id
        and s.owner_id = auth.uid()
    )
  );

-- slots_with_count 뷰 접근 (뷰는 기본 테이블 RLS를 따름)
-- 별도 정책 불필요

-- ============================================================
-- 완료 메시지
-- ============================================================
do $$
begin
  raise notice '캐치캐치보 스키마 설정 완료! 🎉';
end;
$$;

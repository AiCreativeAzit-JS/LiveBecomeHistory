-- AI와 쓰기(실사용자 시험, 2026-10-27 대표 결정): 켤 회원 · 동의 기록 · 대화 보관 · 사용량 기록
-- 운영 적용 이력: (아직 적용 안 함 — 적용 전 대표 승인)
-- · profiles.ai_enabled: 관리자가 시험 참여자만 켠다(public.admin_set_ai). 회원 본인은 바꿀 수 없다(profiles 쓰기는 0009에서 막혀 있음)
-- · ai_consents: 첫 사용 동의(본인만 쓰기·읽기, 관리자 읽기)
-- · ai_threads: 글감 하나 = 대화 하나. 본인 읽기·쓰기, 시험 기간에는 관리자도 읽기(대표 결정: 「테스트 기간은 대화 보기」 — 처리방침·동의 화면에 적음)
-- · ai_usage: AI를 부를 때마다 서버 함수(ai-write, 서비스 키)만 적는다. 본인·관리자 읽기. 하루 상한(3,000원) 계산에 쓴다
-- 보관: 시험 기간 + 1년(대표 결정). 회원 탈퇴 시 cascade 로 함께 지워진다

alter table public.profiles add column if not exists ai_enabled boolean not null default false;

create table if not exists public.ai_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version text not null,
  agreed_at timestamptz not null default now()
);
alter table public.ai_consents enable row level security;
create policy ai_consents_own_read  on public.ai_consents for select to authenticated using (user_id = (select auth.uid()) or private.is_admin());
create policy ai_consents_own_write on public.ai_consents for insert to authenticated with check (user_id = (select auth.uid()));

create table if not exists public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  topic_key text not null,                 -- 글감 번호(이번 주 글감·기본 꾸러미·남겨 둔 장면·내가 정한 글감)
  topic jsonb not null,                    -- 글감 이름·첫 질문
  state jsonb not null default '{}'::jsonb, -- 대화·원고 카드·단계(화면이 그대로 다시 그릴 수 있는 모양)
  updated_at timestamptz not null default now(),
  unique (book_id, topic_key)
);
create index if not exists ai_threads_user on public.ai_threads(user_id);
alter table public.ai_threads enable row level security;
create policy ai_threads_read   on public.ai_threads for select to authenticated using (user_id = (select auth.uid()) or private.is_admin());
create policy ai_threads_insert on public.ai_threads for insert to authenticated with check (user_id = (select auth.uid()) and private.book_is_mine(book_id));
create policy ai_threads_update on public.ai_threads for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and private.book_is_mine(book_id));
create policy ai_threads_delete on public.ai_threads for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid references public.books(id) on delete set null,
  mode text not null,                      -- think · summarize · draft · fix · revise_q · revise
  model text not null,
  input_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cache_write_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_krw numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_day on public.ai_usage(user_id, created_at);
alter table public.ai_usage enable row level security;
create policy ai_usage_read on public.ai_usage for select to authenticated using (user_id = (select auth.uid()) or private.is_admin());
-- 쓰기 규칙 없음 = 회원은 못 쓴다(서버 함수가 서비스 키로만 적는다)

-- 관리자: 시험 참여자 켜기·끄기
create function public.admin_set_ai(u uuid, ok boolean) returns void
language plpgsql security definer set search_path = ''
as $$ begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  update public.profiles set ai_enabled = ok where id = u;
end $$;
revoke all on function public.admin_set_ai(uuid, boolean) from public, anon;
grant execute on function public.admin_set_ai(uuid, boolean) to authenticated;

-- 되돌리기(rollback)
-- drop function if exists public.admin_set_ai(uuid, boolean);
-- drop table if exists public.ai_usage; drop table if exists public.ai_threads; drop table if exists public.ai_consents;
-- alter table public.profiles drop column if exists ai_enabled;

-- 0017 ai_prompts: AI 지침서(시스템 프롬프트·단계 지시)를 저장소 밖(DB)에 둔다.
-- 서버 함수 ai-write 가 서비스 키로만 읽는다(켜진 한 줄 active). 화면·로그인한 회원·익명은 읽을 수 없다.
-- 바꿀 때: 새 줄을 넣고 켠다(이전 줄은 기록으로 남는다).
create table if not exists public.ai_prompts (
  id bigint generated always as identity primary key,
  version text not null unique,
  system_prompt text not null,
  asks jsonb not null,
  active boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);
alter table public.ai_prompts enable row level security;
revoke all on public.ai_prompts from anon, authenticated;
-- 켜진 줄은 하나만
create unique index if not exists ai_prompts_one_active on public.ai_prompts ((true)) where active;
comment on table public.ai_prompts is 'AI 지침서. 서비스 키(서버 함수)만 읽는다. 지침서 글은 공개 저장소에 올리지 않는다.';

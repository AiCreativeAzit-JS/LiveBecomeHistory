-- 쪽 저장을 한 번에(트랜잭션) + 판 번호(rev) 잠금.
-- 두 곳에서 같은 책을 열어도, 나중 저장이 앞 저장을 조용히 덮어쓰지 않는다(판 번호가 다르면 멈추고 알린다).
-- 보안 경계는 그대로 RLS가 지킨다(security invoker: 부른 사람 권한으로만 움직인다).
alter table public.books add column rev integer not null default 0;   -- 저장할 때마다 1씩 오르는 판 번호
grant update (rev) on public.books to authenticated;                   -- 함수가 부른 사람 권한으로 올린다(자기 책에만 영향)

create function public.save_pages(p_book uuid, p_rev integer, p_title text, p_pages jsonb, p_deleted uuid[], p_replace boolean default false)
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  cur integer; nrev integer; keep uuid[];
begin
  -- 1) 내 책 행을 잠근다(RLS: 남의 책·휴지통 책이면 0행)
  select rev into cur from public.books where id = p_book and deleted_at is null for update;
  if cur is null then raise exception 'book not found' using errcode = '42501'; end if;
  -- 2) 판 번호가 다르면(다른 곳에서 먼저 저장) 아무것도 바꾸지 않고 알린다. p_replace=true 는 「내 내용으로 덮어쓰기」
  if not p_replace and p_rev is not null and cur <> p_rev then
    return jsonb_build_object('ok', false, 'conflict', true, 'rev', cur);
  end if;
  -- 3) 보낸 쪽만 upsert(book_id 는 늘 이 책으로 못 박는다)
  insert into public.pages (id, book_id, position, name, bg, flow_from, els)
  select (r->>'id')::uuid, p_book, coalesce((r->>'position')::int, 0), left(coalesce(r->>'name',''), 60),
         coalesce(nullif(r->>'bg',''), '#FFFFFF'), nullif(r->>'flow_from','')::uuid, coalesce(r->'els', '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_pages, '[]'::jsonb)) r
  on conflict (id) do update set position = excluded.position, name = excluded.name, bg = excluded.bg,
         flow_from = excluded.flow_from, els = excluded.els;
  -- 4) 지우기: 덮어쓰기면 목록에 없는 쪽 전부, 아니면 내가 지운 쪽만
  if p_replace then
    select coalesce(array_agg((r->>'id')::uuid), '{}') into keep from jsonb_array_elements(coalesce(p_pages,'[]'::jsonb)) r;
    delete from public.pages where book_id = p_book and not (id = any(keep));
  elsif coalesce(array_length(p_deleted, 1), 0) > 0 then
    delete from public.pages where book_id = p_book and id = any(p_deleted);
  end if;
  -- 5) 제목·판 번호
  update public.books set rev = cur + 1, title = coalesce(nullif(left(btrim(p_title), 120), ''), title)
   where id = p_book returning rev into nrev;
  return jsonb_build_object('ok', true, 'rev', nrev);
end $$;
revoke all on function public.save_pages(uuid, integer, text, jsonb, uuid[], boolean) from public, anon;
grant execute on function public.save_pages(uuid, integer, text, jsonb, uuid[], boolean) to authenticated;

-- 되돌리기(rollback): 화면 코드도 함께 이전 판으로 되돌려야 한다(새 화면은 save_pages 를 부른다)
-- drop function if exists public.save_pages(uuid, integer, text, jsonb, uuid[], boolean);
-- alter table public.books drop column if exists rev;

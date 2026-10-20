-- 미디어 기록(media)은 서버 함수만 만든다 — 레드팀 RT-002(D22).
-- 회원이 media 표를 직접 INSERT·UPDATE 할 수 있으면 크기(size_bytes)를 0으로 고쳐 책당 200MB 한도를 피하거나,
-- 저장 경로(storage_path)·소유자(owner_id)·책(book_id)을 바꿔 다른 규칙을 속일 수 있다.
-- 뿌리 원칙: 클라이언트가 바꾸는 값(storage_path·size_bytes)을 믿지 않는다.
-- 회원에게는 설명(caption) 수정만 남긴다. 기록 생성은 Edge Function media(commit)가 서비스 키로 하되,
-- 함수 안에서 승인된 회원인지(am_i_approved) · 내 책인지 · 실제 올라간 파일 크기인지 확인한다.
revoke insert, update on public.media from authenticated;
grant update (caption) on public.media to authenticated;

-- 용량 검사는 INSERT 뿐 아니라 UPDATE(크기·책이 바뀔 때)에도. 합산할 때 자기 행은 뺀다(고치는 경우 두 번 세지 않게)
create or replace function private.check_book_media_quota() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare total bigint;
begin
  select coalesce(sum(size_bytes), 0) into total from public.media where book_id = new.book_id and id <> new.id;
  if total + new.size_bytes > 209715200 then
    raise exception 'book media quota exceeded (200MB)' using errcode = '54000';
  end if;
  return new;
end $$;
drop trigger if exists media_quota on public.media;
create trigger media_quota before insert or update of size_bytes, book_id on public.media
  for each row execute function private.check_book_media_quota();

-- 서버 함수가 「부른 사람이 승인된 회원인가」를 물을 수 있게(부른 사람 권한으로 호출 → auth.uid() 가 그 사람)
create function public.am_i_approved() returns boolean
language sql stable security definer set search_path = ''
as $$ select private.is_approved() $$;
revoke all on function public.am_i_approved() from public, anon;
grant execute on function public.am_i_approved() to authenticated;

-- 관리자 사용량: R2 합계(media 기록 크기 합 — 화면용+인쇄용 두 벌)와 기록 수를 더한다(지금까지는 예전 저장소만 세어 대시보드에 R2 가 안 보였다)
create or replace function public.admin_usage() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', coalesce((select sum((o.metadata->>'size')::bigint) from storage.objects o where o.bucket_id = 'book-media'), 0),
    'storage_files', (select count(*) from storage.objects o where o.bucket_id = 'book-media'),
    'r2_bytes', coalesce((select sum(m.size_bytes) from public.media m where m.storage_path like 'r2:%'), 0),
    'media_files', (select count(*) from public.media)
  );
end $$;

-- 배포 순서: 이 마이그레이션(DB) → Edge Function media 새 판 배포. 거꾸로 하면 새 함수가 am_i_approved 를 못 찾아 올리기가 전부 막힌다(닫힌 쪽으로 실패).
-- 되돌리기(rollback)
-- grant insert, update on public.media to authenticated;
-- drop function if exists public.am_i_approved();
-- drop trigger if exists media_quota on public.media;
-- create trigger media_quota before insert on public.media for each row execute function private.check_book_media_quota();  -- (0004 판 함수는 자기 행 제외가 없어도 INSERT 에선 결과 같음)
-- admin_usage 는 0008 판(db_bytes·storage_bytes·storage_files)으로 create or replace

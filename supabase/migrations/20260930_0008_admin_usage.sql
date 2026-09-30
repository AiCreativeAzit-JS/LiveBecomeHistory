-- 관리자 대시보드용 사용량: 데이터베이스 크기, 저장소 파일 수·용량.
-- 관리자만 부를 수 있고, 숫자만 돌려준다(파일 이름·내용 없음).
create function public.admin_usage() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', coalesce((select sum((o.metadata->>'size')::bigint) from storage.objects o where o.bucket_id = 'book-media'), 0),
    'storage_files', (select count(*) from storage.objects o where o.bucket_id = 'book-media')
  );
end $$;
revoke all on function public.admin_usage() from public, anon;
grant execute on function public.admin_usage() to authenticated;

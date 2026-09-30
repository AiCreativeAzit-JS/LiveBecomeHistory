-- 관리자 화면이 "지금 로그인한 사람이 관리자인가"를 확인하는 함수.
-- 결과만 돌려주며(true/false), 관리자 목록 자체는 노출하지 않는다.
create function public.am_i_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select private.is_admin() $$;
revoke all on function public.am_i_admin() from public, anon;
grant execute on function public.am_i_admin() to authenticated;

-- 책 한 권에 올릴 수 있는 미디어(사진·영상·노래) 합계 200MB 제한(비용 폭주 방지).
-- 파일 하나의 상한(50MB)은 저장소 버킷 설정이 담당한다.
create function private.check_book_media_quota() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare total bigint;
begin
  select coalesce(sum(size_bytes), 0) into total from public.media where book_id = new.book_id;
  if total + new.size_bytes > 209715200 then
    raise exception 'book media quota exceeded (200MB)' using errcode = '54000';
  end if;
  return new;
end $$;
revoke all on function private.check_book_media_quota() from public, anon, authenticated;
create trigger media_quota before insert on public.media
  for each row execute function private.check_book_media_quota();

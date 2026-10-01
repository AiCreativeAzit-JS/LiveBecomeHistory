#!/usr/bin/env python3
"""프로그램 저작권 등록용 소스코드 발췌본(텍스트, 20쪽)을 만든다.

- 쪽마다 50줄(머리말 2줄 + 본문 46줄 + 빈 줄 + 쪽 번호), 한 줄 화면 폭 100칸(한글은 2칸으로 셈)
- 줄 앞 숫자 = 원본 파일의 줄 번호(나중에 원본과 대조할 수 있게)
- 직접 작성한 코드만 넣는다. 외부 라이브러리(lib/supabase-js.umd.js, lib/qrcode.js)는 넣지 않는다.
- 공개용 접속 키는 '<공개 키 생략>'으로 가린다.
실행: python3 docs/registration/make_excerpt.py  →  docs/registration/소스코드_발췌본.txt
"""
import os, re, unicodedata, datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(os.path.dirname(__file__), '소스코드_발췌본.txt')
PAGES, PER_PAGE, BODY, WIDTH = 20, 50, 46, 100
TITLE = '인물대백과사 자서전 전자책 편집기(웹)'
VERSION = '0.9 (베타)'

# (제목, 파일, [(시작줄, 끝줄), ...]) — 프로그램의 독창적인 핵심 순서대로
SECTIONS = [
    ('1. 페이지 모델: 신국판 152×225mm, 여백·글상자·미디어 페이지 틀', 'studio/index.html', [(321, 324), (341, 341), (666, 681)]),
    ('2. 글 흐름 엔진: 넘친 글은 다음 쪽으로, 빈자리가 생기면 끌어오기', 'studio/index.html', [(702, 756)]),
    ('3. 미디어 배치: 같은 종류의 자리 → 지금 쪽의 빈 공간 → 새 쪽', 'studio/index.html', [(558, 593)]),
    ('4. 인쇄용 전자책: 영상·노래 자리에 QR 코드 자동 생성', 'studio/index.html', [(377, 385)]),
    ('5. 책 그리기와 안전 검사(서가·내보내기 공용)', 'lib/book-render.js', [(1, 90)]),
    ('6. 책 보기: 두 쪽 펼침 · 3D 책장 넘김 · 노래 재생기 · 복사 방지', 'lib/book-viewer.js', [(1, 7), (30, 198)]),
    ('7. 서버: 비밀 링크로 책 보기', 'supabase/functions/shared-book/index.ts', [(1, 47)]),
    ('8. 서버: 회원 탈퇴(계정·책·파일 삭제)', 'supabase/functions/delete-account/index.ts', [(1, 59)]),
    ('9. 데이터 구조와 접근 규칙', 'supabase/migrations/20260930_0001_core_schema.sql', [(1, 204)]),
]
KEY_RE = re.compile(r"sb_publishable_[A-Za-z0-9_\-]+")


def dw(s):  # 화면 폭(한글·전각 = 2칸)
    return sum(2 if unicodedata.east_asian_width(c) in 'WF' else 1 for c in s)


def wrap(text, width):
    out, cur, w = [], '', 0
    for c in text:
        cw = 2 if unicodedata.east_asian_width(c) in 'WF' else 1
        if w + cw > width:
            out.append(cur); cur, w = '', 0
        cur += c; w += cw
    out.append(cur)
    return out


def code_lines():
    """(구분 제목, 표시 줄) 목록을 만든다."""
    rows = []
    for title, path, ranges in SECTIONS:
        src = open(os.path.join(ROOT, path), encoding='utf-8').read().split('\n')
        rows.append(('title', f'■ {title}'))
        rows.append(('title', f'  파일: {path}'))
        for a, b in ranges:
            if rows[-1][0] == 'code':
                rows.append(('gap', '      ⋮  (중략)'))
            for n in range(a, min(b, len(src)) + 1):
                line = KEY_RE.sub('<공개 키 생략>', src[n - 1].replace('\t', '  ').rstrip())
                parts = wrap(line, WIDTH - 6) or ['']
                rows.append(('code', f'{n:5d}│' + parts[0]))
                for p in parts[1:]:
                    rows.append(('code', '     ↳' + p))
        rows.append(('blank', ''))
    return rows


def build():
    today = datetime.date.today().strftime('%Y. %m. %d.')
    intro = [
        f'프로그램 명칭 : {TITLE}',
        f'버전          : {VERSION}',
        '작성 언어     : JavaScript, HTML/CSS, TypeScript(Deno), SQL(PostgreSQL)',
        '실행 환경     : 웹 브라우저 + Supabase(데이터베이스·인증·파일 저장·서버 함수)',
        f'발췌 작성일   : {today}',
        '발췌 기준     : 직접 작성한 소스코드 가운데 프로그램의 특징을 이루는 부분을 순서대로 발췌함.',
        '                외부 공개 라이브러리(supabase-js, qrcode-generator)는 제외함.',
        '                각 줄 앞의 숫자는 원본 파일의 줄 번호, ↳ 는 지면 폭 때문에 이어 쓴 줄, ⋮ 는 중략.',
        '                보안을 위해 접속 키 값은 <공개 키 생략>으로 가림.',
        '',
    ]
    rows = [('intro', x) for x in intro] + code_lines()
    cap = PAGES * BODY
    if len(rows) > cap:  # 20쪽에 맞게 뒤에서 자르되, 잘렸다는 표시를 남긴다
        rows = rows[:cap - 1] + [('gap', '      ⋮  (이하 생략)')]
    pages, toc = [], {}
    for p in range(PAGES):
        chunk = rows[p * BODY:(p + 1) * BODY]
        for kind, text in chunk:
            if kind == 'title' and text.startswith('■'):
                toc.setdefault(text[2:], p + 1)
        pages.append(chunk)
    # 목차를 첫 쪽 소개 바로 뒤에 넣을 자리가 없으므로 따로 반환
    return pages, toc


def render(pages, toc):
    out = []
    for i, chunk in enumerate(pages):
        head = f'{TITLE} {VERSION} · 소스코드 발췌본'
        out.append(head)
        out.append('─' * (WIDTH // 2))
        lines = [t for _, t in chunk]
        lines += [''] * (BODY - len(lines))
        out.extend(lines)
        out.append('')
        foot = f'- {i + 1} / {PAGES} -'
        out.append(' ' * max(0, (WIDTH - dw(foot)) // 2) + foot)
        if i < PAGES - 1:
            out.append('\f')  # 인쇄할 때 쪽 나눔
    return '\n'.join(out).replace('\n\f\n', '\n\f') + '\n'


if __name__ == '__main__':
    pages, toc = build()
    text = render(pages, toc)
    open(OUT, 'w', encoding='utf-8').write(text)
    widest = max(dw(l) for l in text.split('\n'))
    print(f'저장: {OUT}')
    print(f'쪽 수: {len(pages)}, 가장 넓은 줄: {widest}칸')
    for t, p in toc.items():
        print(f'  {p:2d}쪽  {t}')

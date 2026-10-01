#!/usr/bin/env python3
"""프로그램 저작권 등록용 소스코드 발췌본(텍스트, 20쪽)을 만든다.

- 쪽마다 50줄(머리말 2줄 + 본문 46줄 + 빈 줄 + 쪽 번호), 한 줄 화면 폭 100칸(한글은 2칸으로 셈)
- 줄 앞 숫자 = 원본 파일의 줄 번호(나중에 원본과 대조할 수 있게)
- 이 프로그램을 위해 작성한 코드만 넣는다. 외부 라이브러리(lib/supabase-js.umd.js, lib/qrcode.js)는 넣지 않는다.
- 공개용 접속 키는 '<공개 키 생략>'으로 가린다.
실행: python3 docs/registration/make_excerpt.py  →  docs/registration/소스코드_발췌본.txt
PDF: python3 docs/registration/make_excerpt.py --html 발췌본.html --fonts <글꼴폴더>
     글꼴폴더 = npm pack @fontsource/nanum-gothic-coding 을 fontsource-nanum-gothic-coding/ 에 푼 곳(SIL OFL).
     영문·숫자는 시스템의 Liberation Mono(Courier 계열)로 찍힌다.
     그 HTML을 Chromium으로 A4 PDF 인쇄.
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
    ('9. 데이터 구조와 접근 규칙', 'supabase/migrations/20260930_0001_core_schema.sql',
     [(1, 6), (13, 19), (45, 65), (81, 107), (109, 120), (142, 169), (176, 181), (191, 204)]),
    ('10. 쪽 단위 저장 표(편집기의 쪽을 그대로 저장)', 'supabase/migrations/20260930_0005_pages.sql', [(1, 36)]),
]
KEY_RE = re.compile(r"sb_publishable_[A-Za-z0-9_\-]+")


def dw(s):  # 화면 폭(한글·전각 = 2칸)
    return sum(2 if unicodedata.east_asian_width(c) in 'WF' else 1 for c in s)


BREAK_AFTER = set(' ,;({[=+-*/<>&|?:')  # 이 글자 뒤에서 끊으면 단어·이름이 쪼개지지 않는다


def wrap(text, width):
    """화면 폭에 맞춰 줄을 나누되, 단어·변수 이름 한가운데서는 자르지 않는다."""
    out = []
    while dw(text) > width:
        w, cut, last_ok = 0, 0, 0
        for i, c in enumerate(text):
            w += 2 if unicodedata.east_asian_width(c) in 'WF' else 1
            if w > width:
                break
            cut = i + 1
            if c in BREAK_AFTER or unicodedata.east_asian_width(c) in 'WF':
                last_ok = i + 1
        if last_ok >= cut * 0.5:  # 너무 앞쪽이 아니면 그 경계에서 자른다
            cut = last_ok
        out.append(text[:cut].rstrip())
        text = text[cut:].lstrip(' ')
    out.append(text)
    return out


def code_lines():
    """구분마다 (종류, 표시 줄) 묶음 목록을 만든다."""
    blocks = []
    for title, path, ranges in SECTIONS:
        rows = []
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
        blocks.append(rows)
    return blocks


def build():
    today = datetime.date.today().strftime('%Y. %m. %d.')
    intro = [
        f'프로그램 명칭 : {TITLE}',
        f'버전          : {VERSION}',
        '작성 언어     : JavaScript, HTML/CSS, TypeScript(Deno), SQL(PostgreSQL)',
        '실행 환경     : 웹 브라우저 + Supabase(데이터베이스·인증·파일 저장·서버 함수)',
        f'발췌 작성일   : {today}',
        '발췌 기준     : 이 프로그램을 위해 작성한 소스코드 중 특징을 이루는 부분을 순서대로 발췌함.',
        '                외부 공개 라이브러리(supabase-js, qrcode-generator)는 제외함.',
        '                각 줄 앞의 숫자는 원본 파일의 줄 번호, ⋮ 는 중략.',
        '                ↳ 는 코드가 아님: 원본의 한 줄이 지면 폭(100칸)을 넘어 다음 줄로 이어 적었다는 표시.',
        '                보안을 위해 접속 키 값은 <공개 키 생략>으로 가림.',
        '',
    ]
    # 쪽 나누기: 여기서 시작하면 새 쪽에서 시작할 때보다 더 많은 쪽에 걸치게 되는 구분은
    # 다음 쪽 첫 줄부터 시작한다(짧은 구분이 쪽 사이에서 잘리지 않게). 남은 줄이 MIN_START 미만이어도 넘긴다.
    MIN_START = 10
    span = lambda n, first: 1 if n <= first else 1 + -(-(n - first) // BODY)
    pages, cur = [], [('intro', x) for x in intro]
    for block in code_lines():
        room = BODY - len(cur)
        if cur and cur[-1][0] != 'intro':
            room -= 1                                   # 구분 사이 빈 줄
        if room < MIN_START or span(len(block), room) > span(len(block), BODY):
            pages.append(cur); cur = []
        elif cur and cur[-1][0] != 'intro':
            cur.append(('blank', ''))
        for r in block:
            if len(cur) == BODY:
                pages.append(cur); cur = []
            cur.append(r)
    if cur:
        pages.append(cur)
    if len(pages) > PAGES:                              # 20쪽에 맞게 뒤를 자르고 표시를 남긴다
        pages = pages[:PAGES]
        pages[-1] = pages[-1][:BODY - 1] + [('gap', '      ⋮  (이하 생략)')]
    toc = {}
    for i, chunk in enumerate(pages):
        for kind, text in chunk:
            if kind == 'title' and text.startswith('■'):
                toc.setdefault(text[2:], i + 1)
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


def esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def render_html(pages, toc, fonts):
    """텍스트판을 그대로 인쇄한 것 같은 A4 HTML(→ PDF). 꾸밈 없이 검은 글자만, 번호 구분 제목만 크고 굵게."""
    css_links = ''.join(f'<link rel="stylesheet" href="{fonts}/{d}">' for d in (
        'fontsource-nanum-gothic-coding/package/400.css', 'fontsource-nanum-gothic-coding/package/700.css'))
    out = []
    for i, chunk in enumerate(pages):
        rows = []
        for kind, text in chunk + [('blank', '')] * (BODY - len(chunk)):
            if kind == 'title' and text.startswith('■'):
                rows.append(f'<div class="r h">{esc(text)}</div>')
            elif kind == 'intro':  # 한글 1자 = 영문 2자 폭인 글꼴로 찍어야 ':' 줄이 맞는다
                rows.append(f'<div class="r i">{esc(text)}</div>')
            else:
                rows.append(f'<div class="r">{esc(text)}</div>')
        foot = f'- {i + 1} / {PAGES} -'
        out.append(f'''<section class="page"><div class="r">{esc(TITLE)} {esc(VERSION)} · 소스코드 발췌본</div><div class="r">{'─' * (WIDTH // 2)}</div>{''.join(rows)}<div class="r"></div><div class="r f">{esc(foot)}</div></section>''')
    return f'''<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>{esc(TITLE)} 소스코드 발췌본</title>{css_links}
<style>
@page {{ size: A4; margin: 0 }}
body {{ margin: 0; background: #fff; color: #000 }}
.page {{ width: 210mm; height: 297mm; padding: 15mm 15mm 0 17mm; break-after: page; overflow: hidden;
  font: 8.2pt/1 'Liberation Mono', 'Nanum Gothic Coding', monospace }}
.page:last-child {{ break-after: auto }}
.r {{ height: 5.2mm; line-height: 5.2mm; white-space: pre; overflow: hidden }}
.h {{ font-size: 10.5pt; font-weight: 700 }}
.f {{ text-align: center }}
.i {{ font-family: 'Nanum Gothic Coding', monospace }}
</style></head><body>{''.join(out)}</body></html>'''


if __name__ == '__main__':
    import sys
    pages, toc = build()
    if '--html' in sys.argv:  # 사용: --html 출력.html --fonts 글꼴폴더(@fontsource 패키지들을 푼 곳)
        a = sys.argv
        html_out, fonts = a[a.index('--html') + 1], a[a.index('--fonts') + 1]
        open(html_out, 'w', encoding='utf-8').write(render_html(pages, toc, fonts))
        print(f'HTML 저장: {html_out}')
    text = render(pages, toc)
    open(OUT, 'w', encoding='utf-8').write(text)
    widest = max(dw(l) for l in text.split('\n'))
    print(f'저장: {OUT}')
    print(f'쪽 수: {len(pages)}, 가장 넓은 줄: {widest}칸')
    for t, p in toc.items():
        print(f'  {p:2d}쪽  {t}')

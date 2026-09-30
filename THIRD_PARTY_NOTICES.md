# 외부 부품 목록 (Third-party notices)

인물대백과사 책 서비스가 쓰는 외부 코드는 모두 **이 저장소 안에 복사해 보관**합니다.
외부 사이트(CDN)가 사라지거나 바뀌어도 서비스가 멈추지 않게 하기 위해서입니다.
MIT 라이선스는 "서비스"가 아니라 "사용 허락 조건"이라 중단되지 않습니다.
조건은 단 하나, **저작권·허락 문구를 함께 보관**하는 것입니다(아래 licenses 폴더).

| 부품 | 버전 | 용도 | 라이선스 | 파일 | 원본 |
|---|---|---|---|---|---|
| qrcode-generator | 2.0.4 | 인쇄본 QR 코드 | MIT (Kazuhiko Arase) | `lib/qrcode.js` | npm `qrcode-generator` |
| @supabase/supabase-js | 2.117.2 | 로그인·DB·파일 저장 연결 | MIT (Supabase) | `lib/supabase-js.umd.js` | npm `@supabase/supabase-js` (dist/umd/supabase.js) |

파일 지문(SHA-256, 파일이 바뀌지 않았는지 확인용):
```
79ec86f82856005b1c887905cfccfcfbec3821ca61c7fd5a952faa5f778f791c lib/qrcode.js
59d39487c3589843b410322d8a3d562ce022aba1e5ccb16898ef3fb2a0da2ecd lib/supabase-js.umd.js
```

## 관리 규칙
1. 부품을 바꿀 때는 새 버전을 받아 **테스트를 모두 통과한 뒤** 이 표와 지문을 함께 고친다.
2. 라이선스 문구(`lib/licenses/`)는 지우지 않는다.
3. 외부에서 직접 불러오는 것은 글꼴(Google Fonts)뿐이다. 끊겨도 기본 글꼴로 보이며, 필요하면 글꼴 파일도 저장소로 옮긴다(OFL 라이선스).

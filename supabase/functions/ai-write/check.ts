// 고치기·퇴고 답을 서버가 직접 점검한다. AI가 쓴 「한 일 목록(why)」은 믿지 않고, 고치기 전 원고와 새 원고를 코드로 비교한다.
// (v4.4 · 파일럿에서 AI가 「1년 문장은 빼지 않았다」고 보고했지만 최종 원고에서 「1년」이 사라진 일 때문에 만듦)
// 판정만 한다: 빠진 숫자·기간·따옴표 대사·이름, AI가 새로 늘린 인과 이음말, 글이 지나치게 줄어든 경우. 화면이 결과를 보여 주고 되돌릴 수 있게 한다.
// 한계: 형태소 분석 없이 정규식과 정해 둔 목록으로 보므로 놓치거나 잘못 잡을 수 있다(「빠짐」은 강하게, 「늘어남」은 약하게 알린다).

export type Check = { missing: string[]; added: string[]; blocked?: "shrunk" };

const UNIT = "년|개월|달|주|일|시간|분|살|세|명|번|원|시|월|개|곳|권|층|평|차선|퍼센트|%|배|도";
const KO_UNIT = "년|해|달|개월|주|살|세|명|시간|분|원";
const KO_NUM: Record<string, string> = { 일: "1", 한: "1", 두: "2", 삼: "3", 세: "3", 석: "3", 사: "4", 네: "4", 넉: "4", 오: "5", 육: "6", 칠: "7", 팔: "8", 구: "9", 십: "10", 열: "10", 스무: "20", 스물: "20" };
const KO_NUM_RE = Object.keys(KO_NUM).sort((a, b) => b.length - a.length).join("|");
// 「이」는 「이 해(올해)」와 헷갈려 숫자 2로 보지 않는다. 「한 번」「두 번」처럼 흔한 말은 단위에서 뺀다.
const unitKey = (u: string) => (u === "해" ? "년" : u === "개월" ? "달" : u);

const CONNECTORS = ["그래서", "결국", "그러나", "따라서", "때문에", "그 결과", "그러므로", "그러자"];
const REDUCE = /(줄|짧|덜어|덜|빼|삭제|지우|없애|반으로|간단|압축|요약)/;
const strip = (s: string) => s.replace(/[\s.,!?~…'"“”‘’「」『』·\-—]/g, "");

/** 숫자·기간 표현을 {정규화 값 → 원래 낱말}로 뽑는다. 「1년」「일 년」「한 해」는 같은 값(1년)이다. */
export function numbersOf(text: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const x of text.matchAll(new RegExp(`(\\d[\\d,]*(?:\\.\\d+)?)\\s?(${UNIT})|(\\d[\\d,]*(?:\\.\\d+)?)`, "g"))) {
    const n = (x[1] ?? x[3]).replace(/,/g, ""), u = x[2] ?? "";
    const key = u ? n + unitKey(u) : n;
    if (!m.has(key)) m.set(key, x[0].trim());
  }
  for (const x of text.matchAll(new RegExp(`(?<![가-힣])(${KO_NUM_RE})\\s?(${KO_UNIT})`, "g"))) {
    const key = KO_NUM[x[1]] + unitKey(x[2]);
    if (!m.has(key)) m.set(key, x[0].trim());
  }
  return m;
}

/** 따옴표 안의 대사(3글자 이상). */
export function quotesOf(text: string): string[] {
  return [...text.matchAll(/["“「『]([^"“”」』\n]{3,80})["”」』]/g)].map((x) => x[1].trim());
}

/** 이름 후보: 「정선님」「김씨」 꼴과 영문 낱말(AI·IT 등). */
export function namesOf(text: string): string[] {
  const out = new Set<string>();
  for (const x of text.matchAll(/([가-힣]{2,4})(?:님|씨)(?![가-힣])/g)) out.add(x[1]);
  for (const x of text.matchAll(/[A-Za-z]{2,}/g)) out.add(x[0].toLowerCase());
  return [...out];
}

const countOf = (text: string, w: string) => text.split(w).length - 1;

/** prevDoc: 고치기 전 원고(제목+본문), nextDoc: 새 원고, userText: 어르신의 마지막 요청. */
export function checkEdit(prevDoc: string, nextDoc: string, userText: string): Check {
  const out: Check = { missing: [], added: [] };
  if (!prevDoc.trim()) return out;
  const reduceAsked = REDUCE.test(userText);
  const mentioned = (raw: string) => userText.includes(raw) || strip(userText).includes(strip(raw));

  // 1) 글이 지나치게 줄었는가(줄여 달라는 요청이 아닌데 70% 아래)
  if (!reduceAsked && strip(nextDoc).length < strip(prevDoc).length * 0.7) { out.blocked = "shrunk"; return out; }

  // 2) 빠진 숫자·기간
  const pn = numbersOf(prevDoc), nn = numbersOf(nextDoc);
  for (const [k, raw] of pn) if (!nn.has(k) && !mentioned(raw)) out.missing.push(raw);
  // 3) 빠진 따옴표 대사
  const nextStrip = strip(nextDoc);
  for (const q of quotesOf(prevDoc)) if (!nextStrip.includes(strip(q)) && !mentioned(q)) out.missing.push(`「${q}」`);
  // 4) 빠진 이름
  const nextLow = nextDoc.toLowerCase();
  for (const n of namesOf(prevDoc)) if (!nextLow.includes(n) && !mentioned(n)) out.missing.push(n);
  // 5) AI가 새로 늘린 인과·대비 이음말
  for (const c of CONNECTORS) if (countOf(nextDoc, c) > countOf(prevDoc, c) && !userText.includes(c)) out.added.push(c);

  out.missing = [...new Set(out.missing)].slice(0, 6);
  return out;
}

/** 「제목\n\n본문」꼴 원고 글자를 제목과 본문으로 나눈다. */
export function splitDoc(doc: string): { title: string; body: string } {
  const i = doc.indexOf("\n\n");
  return i < 0 ? { title: doc.trim(), body: "" } : { title: doc.slice(0, i).trim(), body: doc.slice(i + 2) };
}

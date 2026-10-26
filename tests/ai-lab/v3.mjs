// 지침서 v3 = 2026-10-25 운영 서버(ai-write 버전 1)에 올라간 것을 그대로 얼린 기준선. 바꾸지 않는다.
import { SYSTEM_PROMPT, PROMPT_VERSION } from "./v3-prompt.mjs";
import { PIECES } from "./lib.mjs";
export { SYSTEM_PROMPT, PROMPT_VERSION };

const str = { type: "string" }, strs = { type: "array", items: { type: "string" } };
const obj = (p) => ({ type: "object", properties: p, required: Object.keys(p), additionalProperties: false });
export const MODES = {
  think: { effort: "low",
    ask: "생각하기 단계입니다. 선생님의 마지막 답을 받아 되비추기 1~2문장과 질문 하나로 답하세요(합쳐 3문장 이내). covered 에는 지금까지 대화로 채워진 관점(장면·사람·사건·마음·의미 가운데)을 모두 넣고, 다섯이 웬만큼 채워졌거나 질문이 8개에 이르렀으면 ready 를 true 로 하고 reply 는 빈 문자열로 두세요.",
    schema: obj({ reply: str, covered: { type: "array", items: { type: "string", enum: PIECES } }, ready: { type: "boolean" } }) },
  summarize: { effort: "medium",
    ask: "생각하기를 마칩니다(12장). 선생님 표현을 살린 가장 선명한 장면을 최대 3개 scenes 에 넣으세요. 초고는 쓰지 않습니다.",
    schema: obj({ scenes: strs }) },
  draft: { effort: "medium",
    ask: "고른 장면을 중심으로 초고를 쓰세요(13~19장). 첫 줄 고정 문장과 마지막 안내 문장은 화면이 넣으니 쓰지 말고, 제목과 본문만 주세요. 본문의 문단은 빈 줄로 나눕니다.",
    schema: obj({ title: str, body: str }) },
  fix: { effort: "medium",
    ask: "선생님이 원고를 고쳐 달라고 하셨습니다. 그 말만큼만 고친 원고 전체와, 무엇을 왜 고쳤는지 한 줄씩을 주세요. 고칠 수 없는 말이면 changed 를 false 로 하고 reply 에 한두 문장으로 답하세요.",
    schema: obj({ changed: { type: "boolean" }, reply: str, title: str, body: str, why: strs }) },
  revise_q: { effort: "medium",
    ask: "퇴고 단계입니다(25~26장, 39장). 지금 원고를 다섯 가지로 진단하고, 고칠 곳만 fixes 에 '번호 이름 — 한 줄' 모양으로 넣으세요. 구체적인 장면이나 실제 대사가 꼭 더 필요하면 question 에 질문 하나를, 아니면 빈 문자열을 넣으세요. 이미 물은 질문 수가 3이면 빈 문자열입니다.",
    schema: obj({ fixes: strs, question: str }) },
  revise: { effort: "medium",
    ask: "퇴고본을 쓰세요(21~28장). 답하신 말은 알맞은 자리에 넣고, '기억 안 나요'인 자리는 비워 둡니다. 제목과 본문, 무엇을 왜 고쳤는지 한 줄씩을 주세요.",
    schema: obj({ title: str, body: str, why: strs }) },
};
// v3 는 대화 첫 줄에 글감 이름만 넘긴다
export const topicLine = (t) => `[글감] ${String(t.title ?? "").slice(0, 80)}`;

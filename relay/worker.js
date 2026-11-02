/**
 * 사업단 AI 중계 서버 — Cloudflare Workers AI 무료 버전
 * - Cloudflare가 호스팅하는 오픈소스 모델(Llama 등)을 사용하므로 API 키가 필요 없고, 하루 10,000 뉴런까지 무료임
 * - Worker에 Workers AI 바인딩(변수 이름 AI)만 추가하면 동작함
 * - 허용된 사이트(ALLOWED_ORIGINS)에서 온 요청만 처리하고, 응답은 사이트가 기대하는 형식으로 돌려줌
 */
const DEFAULT_ALLOWED = [
  "https://yoong0520.github.io",
];
// 앞에서부터 차례로 시도함(모델이 폐기되면 다음 모델로 넘어감)
const MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/qwen/qwen3-30b-a3b-fp8",
];
const MAX_TOKENS_CAP = 4000;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map(s => s.trim()) : DEFAULT_ALLOWED;
    const ok = allowed.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": ok ? origin : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Max-Age": "86400",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: { message: "POST only" } }, 405, cors);
    if (!ok) return json({ error: { message: "허용되지 않은 사이트에서의 요청입니다" } }, 403, cors);
    if (!env.AI) return json({ error: { message: "Worker에 Workers AI 바인딩(AI)이 설정되지 않았습니다" } }, 500, cors);

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: { message: "잘못된 요청 형식" } }, 400, cors); }
    const max_tokens = Math.min(Number(body.max_tokens) || 3000, MAX_TOKENS_CAP);
    const messages = Array.isArray(body.messages) ? body.messages.slice(-6).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "") })) : null;
    if (!messages || !messages.length) return json({ error: { message: "messages가 비어 있습니다" } }, 400, cors);
    messages.unshift({ role: "system", content: "당신은 한국 대학 교육공학 전문가이자 공공기관 보고서 작성자입니다. 반드시 한국어로만 답하고, 요청된 JSON 형식만 출력합니다. 설명이나 머리말을 덧붙이지 않습니다." });

    let lastErr = null;
    for (const model of MODELS) {
      try {
        const r = await env.AI.run(model, { messages, max_tokens, temperature: 0.4 });
        // 모델에 따라 response가 문자열이 아니라 이미 파싱된 JSON 객체로 올 수 있음 → 문자열로 통일
        let raw = typeof r === "string" ? r : (r.response ?? r.result?.response ?? r.choices?.[0]?.message?.content ?? r);
        let text = typeof raw === "string" ? raw : JSON.stringify(raw);
        text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        if (!text) throw new Error("빈 응답");
        return json({ model, content: [{ type: "text", text }] }, 200, cors);
      } catch (e) {
        lastErr = e;
        const msg = String(e && e.message || e);
        // 무료 한도 소진·요청 과다는 다음 모델로 넘기지 않고 바로 알림
        if (/quota|limit|neuron|429|exceed/i.test(msg)) {
          return json({ error: { message: "오늘의 무료 AI 사용 한도를 모두 사용했습니다. 내일 다시 시도해 주세요" } }, 429, cors);
        }
      }
    }
    return json({ error: { message: "AI 모델 호출에 실패했습니다: " + String(lastErr && lastErr.message || lastErr).slice(0, 120) } }, 502, cors);
  },
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, "content-type": "application/json" } });
}

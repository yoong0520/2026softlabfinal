/**
 * 사업단 AI 중계 서버 (Cloudflare Workers)
 * - 교수는 API 키 없이 사이트의 「AI 설정 → AI 중계 서버 주소」에 이 Worker 주소만 입력하면 됨
 * - Anthropic API 키는 Worker의 비밀 변수(ANTHROPIC_API_KEY)에만 저장됨
 * - 허용된 사이트(ALLOWED_ORIGINS)에서 온 요청만 처리함
 */
const DEFAULT_ALLOWED = [
  "https://yoong0520.github.io",
];
const ALLOWED_MODELS = ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5"];
const MAX_TOKENS_CAP = 6000;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map(s => s.trim()) : DEFAULT_ALLOWED);
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
    if (!env.ANTHROPIC_API_KEY) return json({ error: { message: "서버에 API 키가 설정되지 않았습니다" } }, 500, cors);

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: { message: "잘못된 요청 형식" } }, 400, cors); }
    const model = ALLOWED_MODELS.includes(body.model) ? body.model : "claude-sonnet-5-5";
    const max_tokens = Math.min(Number(body.max_tokens) || 4000, MAX_TOKENS_CAP);
    const messages = Array.isArray(body.messages) ? body.messages.slice(-6) : null;
    if (!messages || !messages.length) return json({ error: { message: "messages가 비어 있습니다" } }, 400, cors);

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens, messages }),
    });
    const text = await upstream.text();
    return new Response(text, { status: upstream.status, headers: { ...cors, "content-type": "application/json" } });
  },
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, "content-type": "application/json" } });
}

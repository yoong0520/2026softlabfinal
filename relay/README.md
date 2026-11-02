# 사업단 AI 중계 서버 설치 안내 (Cloudflare Workers, 무료 구간)

교수가 API 키 없이 AI 기능을 쓰게 하려면, 사업단 Anthropic API 키를 Cloudflare Worker에 보관하고
사이트는 그 Worker 주소로만 요청을 보내도록 합니다. 설치는 한 번만 하면 됩니다.

## 준비물
- Anthropic API 키 (https://console.anthropic.com → API Keys)
- Cloudflare 계정 (https://dash.cloudflare.com, 무료)

## 설치 순서 (약 10분)
1. Cloudflare 대시보드 → Workers & Pages → Create → Create Worker → 이름 예: `softlab-ai-relay` → Deploy
2. Edit code 버튼 → 편집기의 내용을 모두 지우고 `worker.js` 내용을 붙여넣기 → Deploy
3. Worker의 Settings → Variables and Secrets → Add
   - Type: Secret, 이름 `ANTHROPIC_API_KEY`, 값: Anthropic API 키 → Save
   - (선택) Type: Text, 이름 `ALLOWED_ORIGINS`, 값: `https://yoong0520.github.io`
     여러 사이트를 허용하려면 쉼표로 구분
4. Worker 주소 확인: `https://softlab-ai-relay.<계정이름>.workers.dev`
5. 사이트(https://yoong0520.github.io/2026softlabfinal/) 상단 「AI 설정」→ 「AI 중계 서버 주소」에 4번 주소 입력 → 저장

교수님들께는 사이트 주소와 함께 "AI 설정에 이 중계 서버 주소를 한 번 넣어 주세요"라고 안내하면 됩니다.
(원하면 사이트 코드에 중계 서버 주소를 기본값으로 넣어 설정 단계를 없앨 수 있음)

## 비용·보안
- 사용량은 사업단 Anthropic 계정에 과금됨. 보고서 1건 생성에 보통 수십 원 수준
- Worker는 허용된 사이트(Origin)에서 온 요청만 처리하고, 모델과 최대 토큰을 제한함
- API 키는 Worker 비밀 변수에만 있으며 사이트 코드나 GitHub에는 들어가지 않음

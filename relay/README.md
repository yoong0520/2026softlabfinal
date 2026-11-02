# 사업단 AI 중계 서버 설치 안내 (Cloudflare Workers AI, 완전 무료)

Cloudflare가 직접 호스팅하는 오픈소스 AI 모델(Llama 3.3 70B 등)을 사용합니다.
API 키나 결제 수단이 필요 없고, 하루 10,000 뉴런(보고서 생성 수십 건 수준)까지 무료입니다.
설치는 한 번만 하면 되고, 설치 후 사이트 코드에 주소를 넣으면 교수는 아무 설정 없이 AI를 쓸 수 있습니다.

## 준비물
- Cloudflare 계정 (https://dash.cloudflare.com, 무료, 이메일만 있으면 됨)

## 설치 순서 (약 10분)
1. Cloudflare 대시보드 → 왼쪽 메뉴 Workers & Pages → Create → Create Worker
   - 이름: `softlab-ai-relay` → Deploy
2. Edit code 버튼 → 편집기의 내용을 모두 지우고 이 폴더의 `worker.js` 내용을 붙여넣기 → Deploy
3. Worker 화면 → Settings → Bindings → Add binding → Workers AI
   - Variable name: `AI` → Deploy(저장)
4. (선택) Settings → Variables and Secrets → Add
   - Type: Text, 이름 `ALLOWED_ORIGINS`, 값 `https://yoong0520.github.io`
   - 다른 사이트에서도 쓰려면 쉼표로 구분해 추가
5. Worker 주소 확인: Worker 화면 상단의 `https://softlab-ai-relay.<계정이름>.workers.dev`
6. 이 주소를 사이트 `index.html`의 `DEFAULT_RELAY = ""` 안에 넣고 main에 push
   (또는 사이트 상단 「AI 설정」→「AI 중계 서버 주소」에 입력)

## 동작 확인
- 사이트에서 기본 정보와 수업 운영 핵심을 입력하고 「AI로 보고서 생성」을 누르면 20~60초 뒤 초안이 나타남
- 안 되면 Worker 화면의 Logs(실시간 로그)에서 오류 메시지를 확인

## 비용·한도·품질
- 무료 한도: 하루 10,000 뉴런. Llama 3.3 70B 기준 보고서 1건(입력 약 2,000자, 출력 약 2,500자)에 수십~수백 뉴런 수준이므로 하루 수십 건은 무료 범위
- 한도를 넘으면 사이트에 "오늘의 무료 AI 사용 한도를 모두 사용했습니다" 메시지가 뜨고 다음 날 다시 사용 가능
- 오픈소스 모델이므로 Claude보다 한국어 문장 품질이 다소 낮을 수 있음. 생성 후 미리보기에서 수정하거나 「다시 쓰기」를 권장
- 나중에 Claude로 바꾸려면 worker.js를 Anthropic API 호출 버전으로 교체하고 Secret에 API 키만 추가하면 됨(사이트 코드는 수정 불필요)

## 보안
- Worker는 허용된 사이트(Origin)에서 온 요청만 처리함
- 교수 입력 내용은 Cloudflare AI 처리에만 사용되며 Worker에 저장되지 않음

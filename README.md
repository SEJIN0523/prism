# PRISM V1.1

Professional Investment Intelligence — 일반 웹앱 형태의 독립 투자 대시보드와 개인 포트폴리오 장부. 실제 시세·투자 엔진은 미연결이며 투자 권유가 아닌 참고 자료입니다.

## 출처와 이전 범위

`SEJIN0523/close-score`의 `feat/prism-v1-1`, 커밋 `2e14ab099a386fde570e51e56620c8bfe8f177a3`에서 `gpt/`만 이전했습니다. UI와 장부·저장·복원 로직의 실행 파일 9개는 원본 그대로입니다. 기존 Claude판 워크플로·연구·알고리즘은 포함하지 않습니다. 공동 배포용 `stage-pages.mjs`는 제거하고 독립 `scripts/build-pages.mjs`로 대체했습니다.

## 실행과 사용

저장소 루트에서 `python3 -m http.server 4173` 후 `http://localhost:4173/`를 엽니다. ES 모듈이므로 file:// 실행은 지원하지 않습니다. 서버 API·런타임 패키지 의존성이 없습니다.

1. 포트폴리오에서 초기 투자금·현금을 설정합니다.
2. 매수·매도·입금·출금·배당을 기록합니다. 카탈로그 외 종목도 6자리 코드로 기록 가능합니다.
3. 보유 종목의 평가 가격과 기준일을 직접 입력합니다. 자동 시세 갱신이 아닙니다.
4. 설정에서 JSON 백업을 다운로드하고 다른 기기에서는 파일을 복원합니다.
5. 스마트폰 브라우저 메뉴에서 홈 화면 바로가기를 추가할 수 있습니다. PWA·manifest·서비스워커·오프라인 캐시는 제공하지 않습니다.

## 개인 기록과 복원 안전장치

기록은 브라우저 localStorage의 `prism-v1-state`와 복원 직전 원문 보관 키 `prism-v1-before-restore`에만 저장합니다. 서버·GitHub에 자동 업로드하지 않습니다. 장부 백업 파일을 Git에 추가하지 마세요. 자동 기기 동기화는 없습니다.

복원은 JSON/장부 검증 → 사용자 확인 → 현재 원문 별도 보관 → 본 기록 교체 순서입니다. 보관 실패나 확인 중 다른 탭의 기록 변경 시 복원을 중단합니다. 보관본은 최근 1개이며 다음 복원 시 교체됩니다. **복원 전 기록 다운로드**로 보관본을 내려받아 일반 복원으로 되돌립니다. 초기화는 PRISM 본 기록과 보관본만 처리합니다.

`https://sejin0523.github.io/prism/`과 기존 `/close-score/prism/`은 같은 origin이므로 같은 브라우저 프로필에서는 같은 PRISM 키를 공유합니다. Claude 키와는 구분됩니다. raw.githack·localhost 등 다른 origin이나 다른 기기에서 옮길 때는 JSON 백업·복원이 필요합니다. 기존 Claude 워커의 `/close-score/` 범위는 새 `/prism/` 경로를 제어하지 않습니다.

## 계산 기준

원화·정수 주식·이동평균 원가법. 현금 소수점 2자리 반올림, 수수료·세금 제외. 날짜순, 같은 날짜는 입력순으로 전체 장부를 재검증합니다. 초과 매도·현금 부족 매수·초과 출금은 차단합니다. 평가 가격이 없는 보유 종목이 있으면 총자산·평가손익·수익률 계산을 보류합니다. 손익률 = (실현손익 + 평가손익 + 배당) / 순입금이며 시간가중 수익률이 아닙니다. 순입금이 0 이하이면 표시하지 않습니다.

## 구조

- 루트 `index.html`, `styles.css`, `app.js`: 반응형 화면과 해시 라우팅.
- `components/`: 공통 UI.
- `services/`: 시장 어댑터, 독립 계산, 저장·복원.
- `data/`, `config/`: 제한된 참조 종목, 설정·버전.
- `scripts/build-pages.mjs`: 공개 실행 파일 9개만 `_site/` 루트로 복사.
- `tests/`: 계산, 복원, 독립 빌드, 브라우저 회귀 테스트.

## 검증

Node 22.8 이상에서 `npm test`, `npm run build`. 의존성 설치 불필요.

Playwright와 Chromium이 설치된 환경에서 정적 서버를 켠 뒤:

```sh
PRISM_BASE_URL=http://127.0.0.1:4173/ node tests/browser.cjs
PRISM_BASE_URL=http://127.0.0.1:4173/ node tests/release-browser.cjs
```

Playwright 위치는 `PRISM_PLAYWRIGHT_PATH`로 지정할 수 있습니다. 브라우저 검증은 임시 프로필을 사용합니다. 배포 경로 `/prism/` 검증 시 빌드 결과를 해당 경로에 제공하고 PRISM_BASE_URL을 지정하세요.

## GitHub Pages 배포

목표 URL: **https://sejin0523.github.io/prism/**

새 저장소의 `main` push 또는 수동 실행이 `.github/workflows/pages.yml`을 실행합니다. 테스트 → 공개 파일 빌드 → Pages artifact → 배포 순서입니다. 개인 기록·테스트·문서는 배포 artifact에 포함하지 않습니다. `close-score` 저장소에 접근하거나 계산·커밋하는 단계는 없습니다.

GitHub 설정이 필요하면 저장소 **Settings → Pages → Build and deployment → Source → GitHub Actions**를 선택하세요. 그 뒤 **Actions → Deploy PRISM to GitHub Pages → Run workflow → main**을 실행합니다. Deploy 작업이 성공한 다음 목표 URL에서 확인합니다. 워크플로를 파일에 추가한 것만으로 배포 성공을 뜻하지 않습니다.

배포 후 PRISM과 기존 https://sejin0523.github.io/close-score/ 를 각각 확인해야 합니다. 현 환경에서는 Pages API와 두 외부 URL이 네트워크 정책으로 차단되어 실제 배포·정상 접속을 확인하지 못했습니다.

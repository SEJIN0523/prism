# PRISM V1.1 독립 저장소 이전 검증 (설치 지원 이전 이력)

검증일: 2026-10-22 (한국 시간)

## 출처와 보존

- 원본: `SEJIN0523/close-score`, 브랜치 `feat/prism-v1-1`, 커밋 `2e14ab099a386fde570e51e56620c8bfe8f177a3`, `gpt/`.
- 루트 index.html, styles.css, app.js와 components/ui.js, services/{storage,portfolio,market}.js, data/catalog.js, config/app.js 총 9개 실행 파일은 Git 원본과 바이트 일치 확인.
- 기존 공동 배포 워크플로는 가져오지 않음. stage-pages.mjs는 독립 build-pages.mjs로 교체, 공개 파일만 `_site/` 루트에 복사.
- 원본 저장소·기존 Claude판·연구 브랜치에는 수정/커밋/푸시/브랜치 삭제 작업 없음.

## 실행 결과

- `npm test`: 16개 통과. 이동평균 원가, 손익·수익률, 초과매수/매도/출금 차단, 날짜순 검증, JSON 검증·왕복, 복원 전 보관, 저장 공간 실패, 다른 탭 충돌, 손상 원문 보관, 초기화 범위, 독립 Pages 루트 빌드 및 재실행, 소스 덮어쓰기 차단.
- `npm run build`: 성공. `_site/index.html` 실행, 9개 공개 실행 파일만 포함. 테스트/문서/백업/manifest/서비스워커 미포함.
- `tests/browser.cjs`: 빌드 결과를 로컬 HTTP `/prism/`에 제공하고 320/390/430/768/1440px × 다크/라이트 × 5개 화면 50개 조합 통과, 가로 넘침 없음. 검색/필터/정렬/관심/비교/뒤로 가기, 거래 추가·수정·삭제·초과 거래 차단, 자산 계산, JSON 백업/복원/초기화, 설정 유지 확인. pageerror 0건.
- `tests/release-browser.cjs`: 복원 취소와 잘못된 JSON은 원문 유지. 복원 전 보관본 다운로드 내용 일치, 새로고침 유지, 다른 탭 변경 감지, Claude 키 유지, 모바일 복원 화면, 초기화 시 보관본 제거 확인. manifest 0개, 서비스워커 등록 0개, GET 외 업로드 요청 0건, pageerror 0건.
- 별도 브라우저 프로필에 원본 Claude `sw.js`를 `/close-score/` 범위로 그대로 등록 후 `/prism/` 이동: 서비스워커 controller null, 기존 캐시에 `/prism/` 요청 0개. 기존 Claude 테마 키 유지.
- 검증 환경: Node 24, headless Chromium. 실제 스마트폰 하드웨어 검증은 미실행.

## 외부 배포 검증 제한

- 새 저장소 연결 도구에서 admin/push 권한과 공개 빈 저장소 확인.
- CLI의 GitHub Pages 설정 API는 네트워크 정책에 의해 Forbidden 응답. 따라서 Pages 활성화 여부를 읽거나 변경하지 못함.
- 목표 `https://sejin0523.github.io/prism/`와 기존 `https://sejin0523.github.io/close-score/` 모두 환경 프록시에서 CONNECT 403으로 차단. 실제 페이지 접속/정상 동작을 확인했다고 보고하지 않음.
- 사용자 설정이 필요한 경우: 새 저장소 Settings → Pages → Source를 GitHub Actions로 선택하고, 새 저장소 Actions의 Deploy PRISM to GitHub Pages를 main에서 실행. 성공 뒤 두 URL을 실제 브라우저에서 확인해야 함.


# 최소 PWA 설치 지원 검증 — 2026-10-22 (한국 시간)

- 원래 UI·장부 로직(app.js, components/, config/, data/, services/)은 배포 기준 커밋 `3eed678`과 변경 없음. index.html에 manifest 링크·터치 아이콘·등록 모듈만 추가.
- 추가 파일: manifest.webmanifest, install.js, sw.js, icons/icon-192.png, icons/icon-512.png. 기존 Claude 저장소 파일 수정 없음.
- `npm test`: 기존 16개 + 설치 manifest/PNG 규격 검사 + 워커 캐시·범위·요청 전달 검사 = 18개 통과.
- `npm run build`: 공개 파일 14개 패키징 성공. 테스트·문서·개인 백업 미포함.
- 일반 프로필의 headless Chromium에서 `Page.getAppManifest` 오류 0개, `Page.getInstallabilityErrors` 오류 0개. 서비스워커 scope·script URL, 192/512 이미지 실제 디코딩 크기 확인. 최초 시크릿 테스트 프로필은 in-incognito로 설치가 제한되어, 일반 임시 프로필에서 검증함.
- 네트워크 GET 후 CacheStorage 목록 빈 배열. 오프라인 fetch 실패 확인(오프라인 대체 캐시 없음). 해당 상태에서도 localStorage 장부 원문 유지, 온라인 복귀·새로고침 후 기록 유지. GET 외 업로드 요청 0건, 온라인 pageerror 0건.
- `/close-score/` 이동 후 PRISM 서비스워커 controller null 확인. 워커 단위 테스트에서 외부 origin, POST, `/close-score/`, `/prism-other/` 요청 무간섭 확인.
- 기존 브라우저 테스트 재실행: 50개 화면/테마/너비 조합, 거래·설정·백업·복원·복원 전 보관·다른 탭 충돌·Claude 키 보존 모두 통과. 설치 자산·서비스워커 존재 검사만 새 요구사항에 맞게 변경.
- 실제 삼성 인터넷·Android Chrome에서 앱 설치 메뉴 및 설치 후 standalone 창 실행은 실기기 미검증. manifest standalone 선언과 Chromium 설치 조건까지만 자동 검증함.
- 실제 정식 URL HTTP 검증은 기존 환경 정책의 CONNECT 403 제한 때문에 미검증. 배포 여부는 GitHub Actions 결과로 별도 확인.

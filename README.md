# 2027 마라톤 접수 일정

하프, 10km, 5km을 기본으로 보는 마라톤 접수 일정입니다. 접수 상태는 한국 시간으로 1초마다 다시 계산합니다. 직접 확인한 12개 대회는 `src/data/curated.ts`에 있고, 공개 공고는 `npm run collect`가 `src/data/scraped.json`에 모읍니다. 이름이 겹치면 직접 확인한 대회가 우선합니다.

이 페이지는 접수 상태만 보여 줍니다. 신청은 각 공식 사이트에서 합니다.

## 로컬에서 실행

```bash
npm install
npm run collect
npm run dev
```

브라우저에서 http://127.0.0.1:47231 을 엽니다.

```bash
npm test
npm run build
```

## 공고 수집

`npm run collect`는 약 1.5초에 한 번씩만 요청합니다.

읽는 곳:

- 러닝온 RSS `https://runningon.co.kr/rss.xml` 와 각 대회 페이지의 공식 링크
- 런파인더 첫 화면의 접수중 목록과 그 상세 페이지

읽지 않는 곳:

- 런닝인사이드: 자동 수집을 하지 말라는 고지가 있습니다.
- 러너블 한국어 경로: robots.txt가 `/ko/`를 막습니다.
- 투게더런: 대회 상세가 2,600건을 넘어 대량으로 받지 않고, `/api/`는 robots.txt가 막습니다.
- mara1080.com: 첫 화면에 공개 대회 목록이 없습니다.
- marathon.pe.kr: 인증서 이름이 맞지 않습니다.

## 무료 호스팅을 영구 주소로 켜는 방법

이 환경의 GitHub 연결은 저장소를 만들거나 Pages를 켤 권한이 없습니다. 계정은 이미 있습니다. GitHub 사용자 `youbro0210`입니다. 새 가입은 필요 없고, 공개 저장소 하나와 Pages만 켜면 됩니다.

주소는 `https://youbro0210.github.io/marathon-2027/` 가 됩니다. GitHub Actions가 6시간마다 공고를 다시 받고 사이트를 올립니다. 만료일이 없습니다.

1. https://github.com/new 에서 저장소 이름을 `marathon-2027`, 공개(Public)로 만듭니다. README는 추가하지 않습니다.
2. 이 프로젝트를 그 저장소로 푸시합니다.

```bash
git remote add github https://github.com/youbro0210/marathon-2027.git
git push -u github main
```

3. https://github.com/youbro0210/marathon-2027/settings/pages 에서 Build and deployment의 Source를 **GitHub Actions**로 저장합니다.
4. https://github.com/youbro0210/marathon-2027/actions 에서 “Refresh announcements”를 Run workflow로 한 번 실행합니다. 첫 배포가 끝나면 위 주소가 열립니다.

이메일 인증은 GitHub 계정이 이미 로그인된 상태라면 추가로 묻지 않습니다. 저장소를 만들 권한만 있으면 됩니다.

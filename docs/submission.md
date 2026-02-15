# 밥심 - Submission Assets Workflow

## 1) 로고 생성 (ComfyUI)

```bash
cd menu-today
python generate_logo.py
```

- 로고 파일은 `app-logos/menu-today.png`로 최종 반영
- 선택된 팔레트: comfy-c (빨강 #F10803)

---

## 2) Raw 캡처 (Playwright CLI)

```bash
cd menu-today
npm run dev
```

별도 터미널에서:

```bash
cd menu-today
npm run capture:submission
```

- 기본 URL: `http://localhost:8081`
- 결과 파일:
  - `menu-today/raw/screen-1.png` (홈/초기 화면)
  - `menu-today/raw/screen-2.png` (입력 완료/결과)
  - `menu-today/raw/screen-3.png` (즐겨찾기 등 부가 화면)

---

## 3) 제출 이미지 자동 생성 (generate-submission.js)

```bash
cd ..
node generate-submission.js menu-today
```

- 생성 파일(총 6개): `menu-today/submission/` 에 저장
  - `thumb-square.png` (1000x1000)
  - `thumb-landscape.png` (1932x828)
  - `screenshot-1.png` (636x1048)
  - `screenshot-2.png` (636x1048)
  - `screenshot-3.png` (636x1048)
  - `screenshot-landscape.png` (1504x741)

원칙:
- 썸네일: generate-submission.js 공통 템플릿 사용
- 스크린샷: 앱 주제에 맞는 독창적 시각화 권장 (추후 커스텀 템플릿 적용)
- 앱 컬러(`#F10803`)와 로고 톤 일치 확인
- screen-3는 반드시 결과/데이터가 채워진 화면

---

## 운영 명령

```bash
# 전체 재생성
cd ..
node generate-submission.js menu-today

# 아이콘 변경 시
# 1. app-logos/menu-today.png 교체
# 2. git push to GitHub
# 3. node generate-submission.js menu-today
```

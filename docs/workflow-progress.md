# 밥심 (Menu Today) Workflow Progress

## Current Status
- [x] Core app implementation (App.tsx, recommendation/storage hooks)
- [x] Legal docs (terms.html, privacy.html)
- [x] Layout structure doc (layout-structure.md)
- [x] App info doc (app-info.md)
- [x] Logo generation (ComfyUI → comfy-c 빨강 선택)
- [x] Raw capture script (capture-submission.js)
- [x] App registry entry (apps-registry.md)
- [x] Raw screenshots generated (menu-today/raw/)
- [x] Submission images generated (menu-today/submission/ × 6장)
- [x] 앱 이름 변경: 오늘 메뉴 추천 → 밥심
- [x] 로고-테마 색상 일치 (comfy-c 빨강 #F10803)
- [ ] 점수/등급 금지 위반 수정 (숫자 점수 → 시각적 메타포)
- [ ] 차별화 7항목 보강
- [ ] GitHub Pages 배포 및 문서 연동
- [ ] Production ad group ID replacement

## Execution Order
1. Run app dev server (`npm run dev`)
2. Capture raw screens (`npm run capture:submission`)
3. Generate submission images (`node generate-submission.js menu-today`)
4. Verify files and update registry checklist

## Notes
- Default capture URL is `http://localhost:8081`
- Logo palette: comfy-c `Ruby Bowl` (`#F10803` primary)
- 제출 이미지는 generate-submission.js로 자동 생성 (Pencil MCP 미사용)

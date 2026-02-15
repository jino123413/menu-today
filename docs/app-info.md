# 밥심 App Info

## Basic Metadata
| Field | Value |
|---|---|
| Service Name | 밥심 |
| English Name | Babsim |
| appName | `menu-today` |
| Deep Link | `intoss://menu-today/home` |
| Icon URL | `https://raw.githubusercontent.com/jino123413/app-logos/master/menu-today.png` |
| Primary Color | `#F10803` |
| GitHub | `https://github.com/jino123413/menu-today` |
| Terms | `https://jino123413.github.io/menu-today/terms.html` |
| Privacy | `https://jino123413.github.io/menu-today/privacy.html` |
| Ad Group | `ait-ad-test-interstitial-id` |

## Product Summary
- Purpose: help users decide what to eat quickly with constraint-based recommendations.
- Core flow: set conditions -> request recommendation -> review alternatives -> save favorites.
- Decision quality: recommendation includes score and reason list.

## Screen Structure
1. `추천`
- Inputs: meal time, people, spice, budget, diet type, max cooking time, avoid ingredients.
- Output: picked menu card, alternatives, recommendation reasons.
2. `기록`
- History list of previous recommendations with score and reason chips.
3. `즐겨찾기`
- Favorite menu cards saved from recommendation results.
4. `통계`
- Aggregate stats from history (count, avg people, avg score, top cuisine, top meal time).

## Recommendation Rules
- Daily recommendation attempts are capped (`maxAttempts = 4`).
- Duplicate picks in the same day are prevented by `usedIds`.
- Input signature changes reset daily state for a clean recommendation cycle.
- If strict filtering fails, fallback logic is used with message feedback.

## Local Storage Keys
- `menu-today-device-id`
- `menu-today-today-state`
- `menu-today-history`
- `menu-today-favorites`

## Ad Policy
- Interstitial ad is connected to recommendation action.
- Ad close (`dismiss`) triggers actual recommendation execution.
- If ad is unsupported/unavailable, recommendation runs without blocking.

## Workflow Documents
- Layout: `menu-today/docs/layout-structure.md`
- Submission: `menu-today/docs/submission.md`
- Terms: `menu-today/docs/terms.html`
- Privacy: `menu-today/docs/privacy.html`
- Progress: `menu-today/docs/workflow-progress.md`

## Logo Palette Combinations (ComfyUI)
- A `Fresh Herb`: green base + lime spoon accents
- B `Ruby Bowl` (selected): vivid red base + deep ruby accents
- C `Soft Peach`: warm peach base + salmon accents

## Submission Assets (Target)
- `menu-today/submission/thumb-square.png` (1000x1000)
- `menu-today/submission/thumb-landscape.png` (1932x828)
- `menu-today/submission/screenshot-landscape.png` (1504x741)
- 제출 이미지: `node generate-submission.js menu-today`로 자동 생성

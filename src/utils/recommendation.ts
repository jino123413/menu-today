import {
  BudgetLevel,
  DietType,
  MenuItem,
  MealTime,
  RecommendInput,
  ScoredMenu,
  ScoredReason,
  SpiceLevel,
} from '../types';

type RelaxFlags = {
  budget: boolean;
  spice: boolean;
  people: boolean;
  cookingMinutesMax: boolean;
  dietType: boolean;
  avoidIngredients: boolean;
};

export interface RecommendationResult {
  picked: ScoredMenu | null;
  alternatives: ScoredMenu[];
  fallbackReason: string | null;
  checkedAt: string;
}

const BUDGET_RANK: Record<BudgetLevel, number> = {
  저예산: 0,
  보통: 1,
  넉넉함: 2,
};

const SPICE_RANK: Record<SpiceLevel, number> = {
  순한맛: 0,
  보통: 1,
  매운맛: 2,
  매우매운맛: 3,
};

const MAX_SCORE = 100;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function containsAvoidIngredient(ingredients: string[], avoidIngredients: Set<string>): boolean {
  return ingredients.some((ingredient) => {
    const normalized = ingredient.toLowerCase();
    return Array.from(avoidIngredients).some((avoid) => normalized.includes(avoid));
  });
}

function isAllowedByStrictRules(
  menu: MenuItem,
  input: RecommendInput,
  relax: RelaxFlags,
  avoidIngredients: Set<string>,
): boolean {
  if (!menu.mealTimes.includes(input.mealTime)) {
    return false;
  }

  if (!relax.people && (input.people < menu.servesMin || input.people > menu.servesMax)) {
    return false;
  }

  if (!relax.cookingMinutesMax && menu.cookingMinutes > input.cookingMinutesMax) {
    return false;
  }

  if (
    !relax.budget &&
    BUDGET_RANK[menu.priceBand] > BUDGET_RANK[input.budget]
  ) {
    return false;
  }

  if (
    !relax.dietType &&
    input.dietType !== '전체' &&
    !menu.dietTypes.includes(input.dietType)
  ) {
    return false;
  }

  if (!relax.spice && menu.spice !== input.spice) {
    return false;
  }

  if (!relax.avoidIngredients && containsAvoidIngredient(menu.ingredients, avoidIngredients)) {
    return false;
  }

  return true;
}

function getScore(menu: MenuItem, input: RecommendInput, avoidIngredients: Set<string>): {
  score: number;
  reasons: string[];
  details: ScoredReason[];
} {
  const reasons: string[] = [];
  const details: ScoredReason[] = [];

  let score = 0;

  const peopleDiff = (() => {
    if (input.people < menu.servesMin) {
      return menu.servesMin - input.people;
    }

    if (input.people > menu.servesMax) {
      return input.people - menu.servesMax;
    }

    return 0;
  })();

  const peopleFit = clamp(20 - peopleDiff * 4, 0, 20);
  score += peopleFit;
  details.push({ label: '인원 적합도', value: peopleFit });
  if (peopleDiff === 0) {
    reasons.push('현재 인원에 딱 맞는 인원 구성');
  } else {
    reasons.push('인원 범위에서 상대적으로 가까운 메뉴');
  }

  const cookingPenalty = clamp(menu.cookingMinutes - input.cookingMinutesMax, 0, 60);
  const cookingFit = clamp(15 - cookingPenalty / 4, 0, 15);
  score += cookingFit;
  details.push({ label: '조리 시간 적합도', value: cookingFit });
  if (menu.cookingMinutes <= input.cookingMinutesMax) {
    reasons.push(`조리 시간이 ${menu.cookingMinutes}분으로 빠름`);
  }

  const budgetGap = BUDGET_RANK[menu.priceBand] - BUDGET_RANK[input.budget];
  if (budgetGap <= 0) {
    const budgetFit = 16 - budgetGap * 3;
    score += budgetFit;
    details.push({ label: '예산 적합도', value: budgetFit });
    reasons.push('예산 선호에 맞는 가격대');
  } else {
    const budgetFit = clamp(16 - budgetGap * 6, 0, 16);
    score += budgetFit;
    details.push({ label: '예산 적합도', value: budgetFit });
  }

  const spiceGap = Math.abs(SPICE_RANK[menu.spice] - SPICE_RANK[input.spice]);
  const spiceFit = clamp(12 - spiceGap * 4, 0, 12);
  score += spiceFit;
  details.push({ label: '매운맛 적합도', value: spiceFit });
  if (spiceGap === 0) {
    reasons.push('매운맛 선호와 일치');
  }

  const difficultyBonus = menu.difficulty === '간편' ? 6 : menu.difficulty === '보통' ? 3 : 0;
  score += difficultyBonus;
  details.push({ label: '조리 난이도', value: difficultyBonus });
  if (menu.difficulty === '간편') {
    reasons.push('조리 난이도가 낮아 빠르게 완성');
  }

  const avoidPenalty = avoidIngredients.size > 0 && containsAvoidIngredient(menu.ingredients, avoidIngredients) ? 12 : 0;
  score -= avoidPenalty;
  if (avoidPenalty > 0) {
    details.push({ label: '피하고 싶은 재료', value: -avoidPenalty });
  }

  const fallback = clamp(score, 0, MAX_SCORE);

  return {
    score: fallback,
    reasons: reasons.slice(0, 3),
    details,
  };
}

interface StageConfig {
  label: string;
  relax: RelaxFlags;
  allowUsed: boolean;
}

function getRecommendationsByStage(
  catalog: MenuItem[],
  input: RecommendInput,
  avoidIngredients: Set<string>,
  stage: StageConfig,
): ScoredMenu[] {
  const used = new Set<string>();

  return catalog
    .filter((menu) => isAllowedByStrictRules(menu, input, stage.relax, avoidIngredients))
    .map((menu) => {
      const scored = getScore(menu, input, avoidIngredients);
      return {
        menu,
        score: scored.score,
        reasons: scored.reasons,
        details: scored.details,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (b.details.length !== a.details.length) {
        return b.details.length - a.details.length;
      }

      if (b.menu.cuisine !== a.menu.cuisine) {
        return a.menu.cuisine.localeCompare(b.menu.cuisine);
      }

      return a.menu.name.localeCompare(b.menu.name);
    });
}

const RELAX_STEPS: StageConfig[] = [
  {
    label: '요청 조건을 모두 반영해 엄격 추천',
    relax: {
      budget: false,
      people: false,
      cookingMinutesMax: false,
      dietType: false,
      spice: false,
      avoidIngredients: false,
    },
    allowUsed: false,
  },
  {
    label: '피하고 싶은 재료 조건을 완화해 추천',
    relax: {
      budget: false,
      people: false,
      cookingMinutesMax: false,
      dietType: false,
      spice: false,
      avoidIngredients: true,
    },
    allowUsed: false,
  },
  {
    label: '인원/조리시간 조건을 완화해 추천',
    relax: {
      budget: false,
      people: true,
      cookingMinutesMax: true,
      dietType: false,
      spice: false,
      avoidIngredients: true,
    },
    allowUsed: false,
  },
  {
    label: '식단/예산/매운맛 조건을 완화해 추천',
    relax: {
      budget: true,
      people: true,
      cookingMinutesMax: true,
      dietType: true,
      spice: true,
      avoidIngredients: true,
    },
    allowUsed: false,
  },
  {
    label: '현재 시간대 내에서 최대한 유연하게 추천',
    relax: {
      budget: true,
      people: true,
      cookingMinutesMax: true,
      dietType: true,
      spice: true,
      avoidIngredients: true,
    },
    allowUsed: true,
  },
];

export function getMenuRecommendation(
  menuCatalog: MenuItem[],
  input: RecommendInput,
  usedIds: string[] = [],
  maxAlternatives = 3,
): RecommendationResult {
  if (!menuCatalog.length) {
    return {
      picked: null,
      alternatives: [],
      fallbackReason: '카탈로그가 비어있어 추천을 만들 수 없습니다.',
      checkedAt: new Date().toISOString(),
    };
  }

  const usedSet = new Set(usedIds);
  const avoidIngredients = new Set(input.avoidIngredients.map((value) => value.toLowerCase()));

  let candidates: ScoredMenu[] = [];
  let fallbackReason = '';

  for (const step of RELAX_STEPS) {
    const stageCandidates = getRecommendationsByStage(menuCatalog, input, avoidIngredients, step);

    if (!stageCandidates.length) {
      continue;
    }

    const available = step.allowUsed
      ? stageCandidates
      : stageCandidates.filter((candidate) => !usedSet.has(candidate.menu.id));

    const next = available.length > 0 ? available : stageCandidates;
    candidates = next;
    fallbackReason = step.allowUsed && usedSet.size > 0
      ? `${step.label}. 하루 내 중복 사용 제한이 이미 꽉 차 있어 중복 추천을 허용합니다.`
      : step.label;
    break;
  }

  if (!candidates.length) {
    return {
      picked: null,
      alternatives: [],
      fallbackReason: '선택한 조건으로는 현재 추천 가능한 메뉴가 없습니다.',
      checkedAt: new Date().toISOString(),
    };
  }

  const picked = candidates[0];
  const alternatives = candidates
    .slice(1, Math.max(1, maxAlternatives + 1))
    .filter((candidate) => candidate.menu.id !== picked.menu.id);

  return {
    picked,
    alternatives,
    fallbackReason,
    checkedAt: new Date().toISOString(),
  };
}

export type { BudgetLevel, DietType, MealTime, SpiceLevel };

export type MealTime = '아침' | '점심' | '저녁' | '야식';
export type SpiceLevel = '순한맛' | '보통' | '매운맛' | '매우매운맛';
export type BudgetLevel = '저예산' | '보통' | '넉넉함';
export type DietType = '전체' | '채식' | '고단백' | '저탄수' | '저칼로리';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  mealTimes: MealTime[];
  spice: SpiceLevel;
  cookingMinutes: number;
  servesMin: number;
  servesMax: number;
  priceBand: BudgetLevel;
  difficulty: '간편' | '보통' | '조리중';
  tags: string[];
  dietTypes: DietType[];
  ingredients: string[];
  kcal: number;
}

export interface RecommendInput {
  mealTime: MealTime;
  people: number;
  spice: SpiceLevel;
  budget: BudgetLevel;
  dietType: DietType;
  avoidIngredients: string[];
  cookingMinutesMax: number;
}

export interface ScoredReason {
  label: string;
  value: number;
}

export interface ScoredMenu {
  menu: MenuItem;
  score: number;
  reasons: string[];
  details: ScoredReason[];
}

export interface Recommendation {
  dateKey: string;
  picked: MenuItem;
  alternatives: MenuItem[];
  score: number;
  reasons: string[];
  attempt: number;
  usedIds: string[];
  signature: string;
  createdAt: string;
  input: RecommendInput;
}

export interface DailyState {
  schemaVersion: number;
  dateKey: string;
  attempt: number;
  maxAttempts: number;
  signature: string;
  usedIds: string[];
  recommendation?: Recommendation;
}

export interface HistoryItem {
  id: string;
  dateKey: string;
  mealTime: MealTime;
  people: number;
  menuName: string;
  score: number;
  reasons: string[];
  createdAt: string;
  attempt: number;
}

export type AppScreen = '추천' | '기록' | '즐겨찾기' | '통계';

export interface MenuStats {
  totalCount: number;
  topCuisine: Array<{ label: string; count: number }>;
  topTime: Array<{ label: string; count: number }>;
  avgPeople: number;
  avgScore: number;
}

export function getTodayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateForDisplay(date = new Date()): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dow = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${date.getFullYear()}. ${mm}. ${dd}. (${dow})`;
}

export function normalizeInputString(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toLowerCase());
}

export function createInputSignature(input: {
  mealTime: string;
  people: number;
  spice: string;
  budget: string;
  dietType: string;
  cookingMinutesMax: number;
  avoidIngredients: string[];
}): string {
  const avoid = [...input.avoidIngredients].sort().join(',');
  return [
    input.mealTime,
    input.people,
    input.spice,
    input.budget,
    input.dietType,
    input.cookingMinutesMax,
    avoid,
  ].join('|');
}

export function clampPeople(value: number): number {
  const parsed = Number.isFinite(value) ? value : 1;
  return Math.min(Math.max(Math.round(parsed), 1), 12);
}

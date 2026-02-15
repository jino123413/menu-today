import { DailyState, HistoryItem } from '../types';

const DEVICE_ID_KEY = 'menu-today-device-id';
const TODAY_KEY = 'menu-today-today-state';
const HISTORY_KEY = 'menu-today-history';
const FAVORITES_KEY = 'menu-today-favorites';
const FAVORITES_MAX = 40;
const HISTORY_MAX = 80;
const SCHEMA_VERSION = 1;

async function storageGet(key: string): Promise<string | null> {
  try {
    const { Storage } = await import('@apps-in-toss/web-framework');
    return await Storage.getItem(key);
  } catch {
    return localStorage.getItem(key);
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  try {
    const { Storage } = await import('@apps-in-toss/web-framework');
    await Storage.setItem(key, value);
    return;
  } catch {
    localStorage.setItem(key, value);
  }
}

async function storageRemove(key: string): Promise<void> {
  try {
    const { Storage } = await import('@apps-in-toss/web-framework');
    await Storage.removeItem(key);
    return;
  } catch {
    localStorage.removeItem(key);
  }
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await storageGet(DEVICE_ID_KEY);
  if (existing) return existing;

  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  await storageSet(DEVICE_ID_KEY, id);
  return id;
}

export async function loadTodayState(): Promise<DailyState | null> {
  const raw = await storageGet(TODAY_KEY);
  const parsed = safeParse<DailyState | null>(raw, null);
  return parsed;
}

export async function saveTodayState(state: DailyState | null): Promise<void> {
  if (state == null) {
    await storageRemove(TODAY_KEY);
    return;
  }
  await storageSet(TODAY_KEY, JSON.stringify(state));
}

export async function loadHistory(): Promise<HistoryItem[]> {
  const raw = await storageGet(HISTORY_KEY);
  return safeParse<HistoryItem[]>(raw, []);
}

export async function appendHistory(item: HistoryItem): Promise<void> {
  const history = await loadHistory();
  const next = [item, ...history].slice(0, HISTORY_MAX);
  await storageSet(HISTORY_KEY, JSON.stringify(next));
}

export async function clearHistory(): Promise<void> {
  await storageRemove(HISTORY_KEY);
}

export async function loadFavoriteIds(): Promise<string[]> {
  const raw = await storageGet(FAVORITES_KEY);
  return safeParse<string[]>(raw, []);
}

export async function saveFavoriteIds(ids: string[]): Promise<void> {
  const uniq = Array.from(new Set(ids));
  await storageSet(FAVORITES_KEY, JSON.stringify(uniq.slice(0, FAVORITES_MAX)));
}

export function getSchemaVersion(): number {
  return SCHEMA_VERSION;
}

export interface StateMigrateResult {
  hasMigration: boolean;
  state: DailyState | null;
}

export function migrateDailyState(rawState: DailyState | null): StateMigrateResult {
  if (!rawState) {
    return { hasMigration: false, state: null };
  }

  if (rawState.schemaVersion === SCHEMA_VERSION) {
    return { hasMigration: false, state: rawState };
  }

  return {
    hasMigration: true,
    state: {
      ...rawState,
      schemaVersion: SCHEMA_VERSION,
      attempt: rawState.attempt ?? 0,
      maxAttempts: rawState.maxAttempts ?? 4,
      usedIds: rawState.usedIds ?? [],
    },
  };
}

export { SCHEMA_VERSION };

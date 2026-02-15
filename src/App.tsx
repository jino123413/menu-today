import { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceViewport } from './components';
import { getMenuRecommendation } from './utils/recommendation';
import { MENU_CATALOG } from './data/menu-catalog';
import {
  AppScreen,
  BudgetLevel,
  DailyState,
  DietType,
  HistoryItem,
  MenuItem,
  MealTime,
  Recommendation,
  RecommendInput,
  SpiceLevel,
} from './types';
import {
  appendHistory,
  clearHistory,
  getSchemaVersion,
  loadFavoriteIds,
  loadHistory,
  loadTodayState,
  migrateDailyState,
  saveFavoriteIds,
  saveTodayState,
} from './utils/storage';
import {
  clampPeople,
  createInputSignature,
  formatDateForDisplay,
  getTodayKey,
  normalizeInputString,
} from './utils/date';
import { useInterstitialAd } from './hooks/useInterstitialAd';

type DailyOverview = {
  avgPeople: number;
  avgScore: number;
  topCuisine: Array<{ label: string; count: number }>;
  topMealTime: Array<{ label: string; count: number }>;
};

const MAX_ATTEMPTS = 4;
const MAX_HISTORY = 80;

const MEAL_TIME_OPTIONS: MealTime[] = ['아침', '점심', '저녁', '야식'];
const PEOPLE_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12];
const SPICE_OPTIONS: SpiceLevel[] = ['순한맛', '보통', '매운맛', '매우매운맛'];
const BUDGET_OPTIONS: BudgetLevel[] = ['저예산', '보통', '넉넉함'];
const DIET_OPTIONS: DietType[] = ['전체', '채식', '고단백', '저탄수', '저칼로리'];

const TABS: { key: AppScreen; icon: string; title: string }[] = [
  { key: '추천', icon: 'ri-restaurant-line', title: '추천' },
  { key: '기록', icon: 'ri-history-line', title: '기록' },
  { key: '즐겨찾기', icon: 'ri-heart-line', title: '즐겨찾기' },
  { key: '통계', icon: 'ri-bar-chart-2-line', title: '통계' },
];

function topByCount(values: string[]) {
  const map = new Map<string, number>();

  values.forEach((value) => {
    const key = value.trim() || '기타';
    map.set(key, (map.get(key) ?? 0) + 1);
  });

  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }));
}

function dedupe<T>(items: T[]) {
  return [...new Set(items)];
}

function buildEmptyState(signature: string): DailyState {
  return {
    schemaVersion: getSchemaVersion(),
    dateKey: getTodayKey(),
    attempt: 0,
    maxAttempts: MAX_ATTEMPTS,
    signature,
    usedIds: [],
  };
}

/** 점수를 온기 레벨로 변환 (숫자 점수 직접 노출 금지) */
function scoreToWarmth(score: number): { label: string; className: string } {
  if (score >= 80) return { label: '뜨끈뜨끈', className: 'warmth-hot' };
  if (score >= 60) return { label: '따뜻', className: 'warmth-warm' };
  if (score >= 40) return { label: '미지근', className: 'warmth-lukewarm' };
  return { label: '식음', className: 'warmth-cold' };
}

function WarmthBadge({ score }: { score: number }) {
  const { label, className } = scoreToWarmth(score);
  return <span className={`warmth-badge ${className}`}>{label}</span>;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {sub ? <p className="stat-sub">{sub}</p> : null}
    </div>
  );
}

function MenuCard({
  menu,
  label,
  isFavorite,
  onToggleFavorite,
}: {
  menu: MenuItem;
  label?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  return (
    <article className="menu-card">
      <div className="menu-header-row">
        <div>
          {label ? <p className="menu-label">{label}</p> : null}
          <h3 className="menu-title">{menu.name}</h3>
          <p className="menu-sub">{menu.description}</p>
        </div>
        {onToggleFavorite ? (
          <button
            type="button"
            className={`fav-btn ${isFavorite ? 'active' : ''}`}
            onClick={onToggleFavorite}
            aria-label={`${menu.name} 즐겨찾기 토글`}
          >
            <i className="ri-heart-line" />
          </button>
        ) : null}
      </div>

      <div className="menu-meta-row">
        <span className="menu-meta-badge">{menu.cuisine}</span>
        <span className="menu-meta-badge">{menu.priceBand}</span>
        <span className="menu-meta-badge">{menu.difficulty}</span>
      </div>

      <p className="menu-spec">
        조리 {menu.cookingMinutes}분 · 1인 {menu.kcal.toLocaleString()}kcal · {menu.servesMin}~{menu.servesMax}인분 · {menu.spice}
      </p>

      <div className="tag-list">
        {menu.tags.map((tag) => (
          <span className="tag-chip" key={`${menu.id}-${tag}`}>
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppScreen>('추천');
  const [mealTime, setMealTime] = useState<MealTime>('점심');
  const [people, setPeople] = useState(2);
  const [spice, setSpice] = useState<SpiceLevel>('보통');
  const [budget, setBudget] = useState<BudgetLevel>('보통');
  const [dietType, setDietType] = useState<DietType>('전체');
  const [cookingMinutesMax, setCookingMinutesMax] = useState(30);
  const [avoidText, setAvoidText] = useState('');
  const [avoidIngredients, setAvoidIngredients] = useState<string[]>([]);
  const [dailyState, setDailyState] = useState<DailyState | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { showInterstitialAd } = useInterstitialAd('ait-ad-test-interstitial-id');

  const menuByName = useMemo(() => {
    const map = new Map<string, string>();
    MENU_CATALOG.forEach((menu) => map.set(menu.name, menu.cuisine));
    return map;
  }, []);

  const input: RecommendInput = useMemo(
    () => ({
      mealTime,
      people,
      spice,
      budget,
      dietType,
      avoidIngredients,
      cookingMinutesMax: Math.max(5, Math.min(240, cookingMinutesMax)),
    }),
    [mealTime, people, spice, budget, dietType, avoidIngredients, cookingMinutesMax],
  );

  const signature = useMemo(() => createInputSignature(input), [input]);

  const isStateValid =
    !!dailyState && dailyState.dateKey === getTodayKey() && dailyState.signature === signature;

  const todayState = useMemo<DailyState>(() => {
    if (isStateValid && dailyState) {
      return dailyState;
    }

    return buildEmptyState(signature);
  }, [dailyState, signature, isStateValid]);

  const todayRecommendation = todayState.recommendation;

  const overview = useMemo<DailyOverview>(() => {
    const total = history.length;
    const avgPeople = total === 0 ? 0 : history.reduce((acc, item) => acc + item.people, 0) / total;
    const avgScore = total === 0 ? 0 : history.reduce((acc, item) => acc + item.score, 0) / total;

    const topCuisine = topByCount(history.map((item) => menuByName.get(item.menuName) ?? '기타')).slice(0, 4);
    const topMealTime = topByCount(history.map((item) => item.mealTime)).slice(0, 4);

    return {
      avgPeople,
      avgScore,
      topCuisine,
      topMealTime,
    };
  }, [history, menuByName]);

  const filteredFavorites = useMemo(
    () => MENU_CATALOG.filter((menu) => favorites.includes(menu.id)),
    [favorites],
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const [savedFavorites, savedHistory, stateRaw] = await Promise.all([
        loadFavoriteIds(),
        loadHistory(),
        loadTodayState(),
      ]);

      const todayKey = getTodayKey();
      const migration = migrateDailyState(stateRaw);
      let loadedState = migration.state;

      const shouldReset =
        !loadedState || loadedState.dateKey !== todayKey || loadedState.signature !== signature;

      if (shouldReset) {
        loadedState = buildEmptyState(signature);
        await saveTodayState(loadedState);
      }

      if (!mounted) {
        return;
      }

      setFavorites(savedFavorites);
      setHistory(savedHistory);
      setDailyState(loadedState);
      setMessage(shouldReset ? '입력 조건으로 새로 추천 상태를 시작합니다.' : '');
    };

    void init();

    return () => {
      mounted = false;
    };
  }, [signature]);

  const adjustPeople = (delta: number) => {
    setPeople((prev) => clampPeople(prev + delta));
  };

  const addAvoidIngredient = () => {
    const parsed = normalizeInputString(avoidText);
    if (parsed.length === 0) {
      return;
    }

    setAvoidIngredients((prev) => dedupe([...prev, ...parsed]));
    setAvoidText('');
  };

  const removeAvoidIngredient = (value: string) => {
    setAvoidIngredients((prev) => prev.filter((item) => item !== value));
  };

  const toggleFavorite = async (menuId: string) => {
    const next = favorites.includes(menuId)
      ? favorites.filter((id) => id !== menuId)
      : dedupe([...favorites, menuId]);

    setFavorites(next);
    await saveFavoriteIds(next);
  };

  const resetStateForInput = async () => {
    const next = buildEmptyState(signature);
    await saveTodayState(next);
    setDailyState(next);
    setMessage('조건을 초기화했습니다.');
  };

  const createRecommendation = useCallback(async () => {
    const now = getTodayKey();
    const base =
      isStateValid && dailyState
        ? todayState
        : buildEmptyState(signature);

    if (base.attempt >= base.maxAttempts) {
      setMessage('오늘 추천 횟수(최대 4회)를 모두 사용했습니다.');
      return;
    }

    const result = getMenuRecommendation(MENU_CATALOG, input, base.usedIds ?? [], 3);

    if (!result.picked) {
      setMessage(result.fallbackReason || '조건에 맞는 메뉴가 없습니다.');
      return;
    }

    const picked = result.picked;
    const nextAttempt = base.attempt + 1;
    const nextUsedIds = dedupe([picked.menu.id, ...(base.usedIds ?? [])]);

    const recommendation: Recommendation = {
      dateKey: now,
      picked: picked.menu,
      alternatives: result.alternatives.map((item) => item.menu),
      score: picked.score,
      reasons: picked.reasons,
      attempt: nextAttempt,
      usedIds: nextUsedIds,
      signature,
      createdAt: result.checkedAt,
      input,
    };

    const nextState: DailyState = {
      ...base,
      dateKey: now,
      attempt: nextAttempt,
      usedIds: nextUsedIds,
      recommendation,
    };

    const historyItem: HistoryItem = {
      id: `${now}-${Date.now()}`,
      dateKey: now,
      mealTime: input.mealTime,
      people: input.people,
      menuName: picked.menu.name,
      score: picked.score,
      reasons: picked.reasons,
      createdAt: new Date().toISOString(),
      attempt: nextAttempt,
    };

    await saveTodayState(nextState);
    await appendHistory(historyItem);

    setDailyState(nextState);
    setHistory((prev) => [historyItem, ...prev].slice(0, MAX_HISTORY));

    setMessage(result.fallbackReason || '추천이 완료되었습니다.');
  }, [dailyState, todayState, input, isStateValid, signature]);

  const handleRecommend = useCallback(() => {
    if (isGenerating) {
      return;
    }

    setIsGenerating(true);
    showInterstitialAd({
      onDismiss: () => {
        void createRecommendation().finally(() => {
          setIsGenerating(false);
        });
      },
    });
  }, [createRecommendation, isGenerating, showInterstitialAd]);

  const handleClearHistory = async () => {
    await clearHistory();
    setHistory([]);
    setMessage('기록이 삭제되었습니다.');
  };

  return (
    <div className="app-shell">
      <DeviceViewport />

      <header className="app-header">
        <div>
          <p className="app-kicker">밥심</p>
          <h1 className="app-title">한끼 메뉴를 빠르게 결정</h1>
          <p className="app-subtitle">{formatDateForDisplay()}</p>
        </div>
        <div className="attempt-chip">
          <i className="ri-time-line" />
          {getTodayKey()} {todayState.attempt}/{todayState.maxAttempts}
        </div>
      </header>

      <nav className="tab-bar" aria-label="메인 메뉴 탭">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <i className={tab.icon} />
            <span>{tab.title}</span>
          </button>
        ))}
      </nav>

      <main className="app-content">
        {activeTab === '추천' && (
          <section className="tab-panel">
            <div className="panel-card">
              <h2 className="section-title">입력 조건</h2>

              <div className="field-group">
                <label>식사 시간</label>
                <div className="chip-grid">
                  {MEAL_TIME_OPTIONS.map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={`chip ${mealTime === value ? 'active' : ''}`}
                      onClick={() => setMealTime(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-group">
                <label>인원</label>
                <div className="inline-stepper">
                  <button
                    type="button"
                    className="step-btn"
                    onClick={() => adjustPeople(-1)}
                    disabled={people <= 1}
                  >
                    <i className="ri-subtract-line" />
                  </button>
                  <span className="value-pill">{people}인</span>
                  <button
                    type="button"
                    className="step-btn"
                    onClick={() => adjustPeople(1)}
                    disabled={people >= 12}
                  >
                    <i className="ri-add-line" />
                  </button>
                </div>
                <div className="quick-wrap">
                  {PEOPLE_OPTIONS.map((value) => (
                    <button
                      type="button"
                      key={`people-${value}`}
                      className="quick-chip"
                      onClick={() => setPeople(value)}
                    >
                      {value}인
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-group">
                <label>원하는 매운맛</label>
                <div className="chip-grid">
                  {SPICE_OPTIONS.map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={`chip ${spice === value ? 'active' : ''}`}
                      onClick={() => setSpice(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-group">
                <label>예산</label>
                <div className="chip-grid">
                  {BUDGET_OPTIONS.map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={`chip ${budget === value ? 'active' : ''}`}
                      onClick={() => setBudget(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-group">
                <label>식단 성향</label>
                <div className="chip-grid">
                  {DIET_OPTIONS.map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={`chip ${dietType === value ? 'active' : ''}`}
                      onClick={() => setDietType(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-group">
                <label>최대 조리 시간(분)</label>
                <input
                  type="number"
                  className="number-input"
                  min={5}
                  max={240}
                  value={cookingMinutesMax}
                  onChange={(event) => setCookingMinutesMax(Number(event.target.value))}
                />
              </div>

              <div className="field-group">
                <label>피하고 싶은 재료</label>
                <div className="avoid-input-row">
                  <input
                    value={avoidText}
                    onChange={(event) => setAvoidText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addAvoidIngredient();
                      }
                    }}
                    className="avoid-input"
                    placeholder="예: 마늘, 양파"
                  />
                  <button
                    type="button"
                    className="add-btn"
                    onClick={addAvoidIngredient}
                    disabled={!avoidText.trim()}
                  >
                    추가
                  </button>
                </div>
                {avoidIngredients.length > 0 && (
                  <div className="tag-list">
                    {avoidIngredients.map((item) => (
                      <button
                        type="button"
                        key={item}
                        className="tag-chip dismissible"
                        onClick={() => removeAvoidIngredient(item)}
                        aria-label={`${item} 제거`}
                      >
                        {item}
                        <i className="ri-close-line" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="actions">
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleRecommend}
                  disabled={isGenerating || todayState.attempt >= todayState.maxAttempts}
                >
                  <i className="ri-restaurant-2-line" />
                  {todayState.attempt >= todayState.maxAttempts ? '오늘 추천 완료' : '메뉴 추천 받기'}
                </button>
                <button type="button" className="outline-btn" onClick={resetStateForInput}>
                  조건 초기화
                </button>
              </div>

              {message ? <p className="result-message">{message}</p> : null}
            </div>

            <div className="panel-card">
              <h2 className="section-title">오늘 추천 결과</h2>
              {todayRecommendation ? (
                <>
                  <MenuCard
                    menu={todayRecommendation.picked}
                    label={`추천 (${todayRecommendation.attempt}회차)`}
                    isFavorite={favorites.includes(todayRecommendation.picked.id)}
                    onToggleFavorite={() => toggleFavorite(todayRecommendation.picked.id)}
                  />
                  <p className="result-subtitle">추천 사유</p>
                  <ul className="reason-list">
                    {todayRecommendation.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  {todayRecommendation.alternatives.length > 0 ? (
                    <>
                      <h3 className="sub-heading">추천 대안</h3>
                      <div className="alternative-grid">
                        {todayRecommendation.alternatives.map((menu) => (
                          <MenuCard
                            key={menu.id}
                            menu={menu}
                            isFavorite={favorites.includes(menu.id)}
                            onToggleFavorite={() => toggleFavorite(menu.id)}
                          />
                        ))}
                      </div>
                    </>
                  ) : null}
                </>
              ) : (
                <p className="empty-message">아직 추천 결과가 없습니다. 먼저 추천을 받아보세요.</p>
              )}
            </div>
          </section>
        )}

        {activeTab === '기록' && (
          <section className="tab-panel">
            <div className="panel-card">
              <div className="panel-head">
                <h2 className="section-title">추천 기록</h2>
                <button type="button" className="outline-btn" onClick={handleClearHistory}>
                  기록 삭제
                </button>
              </div>
              {history.length === 0 && <p className="empty-message">아직 기록이 없습니다.</p>}
              {history.map((item) => (
                <article className="history-item" key={item.id}>
                  <p className="history-date">{formatDateForDisplay(new Date(item.createdAt))}</p>
                  <h3 className="menu-title">{item.menuName}</h3>
                  <p className="history-meta">
                    {item.mealTime} · {item.people}인 · <WarmthBadge score={item.score} /> · {item.attempt}회차
                  </p>
                  <ul className="reason-list tiny">
                    {item.reasons.map((reason) => (
                      <li key={`${item.id}-${reason}`}>{reason}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === '즐겨찾기' && (
          <section className="tab-panel">
            <div className="panel-card">
              <h2 className="section-title">즐겨찾기 메뉴</h2>
              {filteredFavorites.length === 0 && (
                <p className="empty-message">즐겨찾기가 없습니다. 추천 결과에서 하트를 눌러 추가해보세요.</p>
              )}
              {filteredFavorites.map((menu) => (
                <MenuCard
                  key={menu.id}
                  menu={menu}
                  isFavorite
                  onToggleFavorite={() => toggleFavorite(menu.id)}
                />
              ))}
            </div>
          </section>
        )}

        {activeTab === '통계' && (
          <section className="tab-panel">
            <div className="panel-card">
              <h2 className="section-title">기록 통계</h2>
              <div className="stat-grid">
                <StatCard label="총 추천 횟수" value={`${history.length}회`} />
                <StatCard label="평균 참여 인원" value={overview.avgPeople.toFixed(1)} sub="명" />
                <StatCard label="평균 온기" value={scoreToWarmth(overview.avgScore).label} />
                <StatCard
                  label="최근 메뉴"
                  value={
                    history.length === 0
                      ? '기록 없음'
                      : dedupe(history.slice(0, 3).map((item) => item.menuName)).join(', ')
                  }
                  sub="최신 3건"
                />
              </div>

              <div className="stat-split">
                <div className="stat-list-col">
                  <h3 className="sub-heading">많이 선택한 시간</h3>
                  {overview.topMealTime.length === 0 ? (
                    <p className="empty-message">데이터가 없습니다.</p>
                  ) : (
                    <ul className="count-list">
                      {overview.topMealTime.map((entry) => (
                        <li key={`meal-${entry.label}`}>
                          <span>{entry.label}</span>
                          <strong>{entry.count}회</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="stat-list-col">
                  <h3 className="sub-heading">많이 고른 요리</h3>
                  {overview.topCuisine.length === 0 ? (
                    <p className="empty-message">데이터가 없습니다.</p>
                  ) : (
                    <ul className="count-list">
                      {overview.topCuisine.map((entry) => (
                        <li key={`cuisine-${entry.label}`}>
                          <span>{entry.label}</span>
                          <strong>{entry.count}회</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

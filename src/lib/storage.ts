import type { DayHistory, RoutineState } from "./routine-types";

const KEY = "daily-routine-os/v1";

export const todayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Logical "today" honoring the user's daily reset hour/minute.
 *  If the current wall-clock time is before the reset moment, the routine
 *  day is still the previous calendar date. */
export const effectiveTodayKey = (state?: RoutineState, now = new Date()) => {
  const hour = state?.settings?.resetHour ?? 0;
  const minute = (state?.settings as any)?.resetMinute ?? 0;
  const shifted = new Date(now);
  // Subtract the reset offset so the boundary aligns with the user's chosen hour.
  shifted.setMinutes(shifted.getMinutes() - (hour * 60 + minute));
  return todayKey(shifted);
};

export const yesterdayKey = (today = todayKey()) => {
  const d = new Date(today + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return todayKey(d);
};

const seed = (): RoutineState => {
  const today = todayKey();
  return {
    lastResetDate: today,
    history: {},
    sections: [],
    routines: [],
  };
};

export const loadState = (): RoutineState => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return applyDailyReset(seed());
    const parsed = JSON.parse(raw) as RoutineState;
    if (!parsed.history) parsed.history = {};
    return applyDailyReset(parsed);
  } catch {
    return applyDailyReset(seed());
  }
};

export const saveState = (s: RoutineState) => {
  localStorage.setItem(KEY, JSON.stringify(s));
};

const snapshotForDate = (state: RoutineState): DayHistory["snapshot"] => {
  const sectionMap = Object.fromEntries(state.sections.map((s) => [s.id, s.title]));
  const snap: DayHistory["snapshot"] = {};
  for (const r of state.routines) {
    snap[r.id] = {
      title: r.title,
      emoji: r.emoji,
      sectionTitle: sectionMap[r.sectionId],
      blocks: r.blocks,
    };
  }
  return snap;
};

/**
 * Daily reset engine — also persists yesterday's completion record into history.
 * If the ending day had unfinished checkbox tasks, record a `pendingCarryForward`
 * so the user can decide (Smart Carry Forward).
 */
export const applyDailyReset = (state: RoutineState): RoutineState => {
  const today = effectiveTodayKey(state);
  if (state.lastResetDate === today) return state;

  // Save snapshot of the day that's ending (state.lastResetDate)
  const endingDate = state.lastResetDate;
  const completedIds = state.routines.filter((r) => r.isCompleted).map((r) => r.id);
  const history = { ...state.history };
  if (endingDate) {
    history[endingDate] = {
      date: endingDate,
      completedRoutineIds: completedIds,
      snapshot: snapshotForDate(state),
      total: state.routines.length,
    };
  }

  // Detect unfinished checkbox blocks for carry-forward prompt.
  // Only routines with an active streak worth saving qualify.
  const carryItems: { routineId: string; blockIds: string[]; preservedStreak?: number; preservedLastCompletedDate?: string }[] = [];
  for (const r of state.routines) {
    const unfinished = (r.blocks ?? [])
      .filter((b) => (b.type === "checkbox" || b.type === "timer") && b.text?.trim() && !b.checked)
      .map((b) => b.id);
    if (unfinished.length > 0 && r.streakCount > 0) {
      carryItems.push({
        routineId: r.id,
        blockIds: unfinished,
        preservedStreak: r.streakCount,
        preservedLastCompletedDate: r.lastCompletedDate,
      });
    }
  }

  // Throttle: only allow the carry-forward popup at most 2 times per calendar month.
  const monthKey = today.slice(0, 7); // YYYY-MM
  const shownDates = state.carryForwardShownDates ?? [];
  const shownThisMonth = shownDates.filter((d) => d.startsWith(monthKey));
  const canShowPopup = shownThisMonth.length < 2;

  const carriedIds = new Set(carryItems.map((i) => i.routineId));
  const willShowPopup = canShowPopup && carryItems.length > 0 && !!endingDate;

  const yesterday = yesterdayKey(today);
  const routines = state.routines.map((r) => {
    // Routines awaiting carry-forward decision keep their streak until user decides.
    if (willShowPopup && carriedIds.has(r.id)) {
      return {
        ...r,
        isCompleted: false,
        blocks: (r.blocks ?? []).map((b) =>
          (b.type === "checkbox" || b.type === "timer") ? { ...b, checked: false } : b
        ),
      };
    }
    const keepStreak = r.lastCompletedDate === yesterday || r.lastCompletedDate === today;
    return {
      ...r,
      isCompleted: false,
      streakCount: keepStreak ? r.streakCount : 0,
      blocks: (r.blocks ?? []).map((b) =>
        (b.type === "checkbox" || b.type === "timer") ? { ...b, checked: false } : b
      ),
    };
  });

  const next: RoutineState = {
    ...state,
    routines,
    lastResetDate: today,
    history,
    pendingCarryForward: willShowPopup
      ? { fromDate: endingDate as string, items: carryItems }
      : undefined,
    carryForwardShownDates: willShowPopup
      ? [...shownDates, today]
      : shownDates,
  };
  saveState(next);
  return next;
};

/** Live snapshot of today's history (for showing today in calendar before reset). */
export const todayLiveHistory = (state: RoutineState): DayHistory => {
  const today = todayKey();
  return {
    date: today,
    completedRoutineIds: state.routines.filter((r) => r.isCompleted).map((r) => r.id),
    snapshot: snapshotForDate(state),
    total: state.routines.length,
  };
};

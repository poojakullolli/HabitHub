import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, ChevronDown, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRoutines } from "@/hooks/useRoutines";
import { todayKey, yesterdayKey } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { MoodHistoryStrip } from "@/components/routine/MoodHistoryStrip";

const monthLabel = (d: Date) => d.toLocaleDateString(undefined, { month: "long", year: "numeric" });

/**
 * Current streak = consecutive days (ending today, or yesterday if today isn't perfect yet)
 * where the day had at least one routine AND every routine was completed.
 * A partial/empty day breaks the streak.
 */
const computeStreak = (history: Record<string, { completedRoutineIds: string[]; total: number }>) => {
  const today = todayKey();
  const isPerfect = (k: string) => {
    const d = history[k];
    return !!d && d.total > 0 && d.completedRoutineIds.length >= d.total;
  };

  let cursor: Date;
  if (isPerfect(today)) {
    cursor = new Date();
  } else {
    // Today not perfect — streak, if any, ended yesterday.
    cursor = new Date(yesterdayKey() + "T12:00:00");
  }

  let streak = 0;
  for (;;) {
    const k = todayKey(cursor);
    if (!isPerfect(k)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const History = () => {
  const navigate = useNavigate();
  const { state } = useRoutines();
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<string>(todayKey());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const toggleExpand = (rid: string) => {
    setExpanded((prev) => ({ ...prev, [rid]: !prev[rid] }));
  };

  const changeMonth = (delta: number) => {
    setDirection(delta > 0 ? "right" : "left");
    setCursor(new Date(year, month + delta, 1));
  };

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayK = todayKey();

  // Respect user's startOfWeek setting (0 = Sun, 1 = Mon)
  const startOfWeek = (state.settings?.startOfWeek ?? 0) as 0 | 1;
  // JS getDay(): 0=Sun…6=Sat. Shift so the week starts on startOfWeek.
  const startWeekday = (firstDay.getDay() - startOfWeek + 7) % 7;

  const cells = useMemo(() => {
    const arr: Array<{ key: string | null; day: number | null }> = [];
    for (let i = 0; i < startWeekday; i++) arr.push({ key: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const key = todayKey(new Date(year, month, d));
      arr.push({ key, day: d });
    }
    return arr;
  }, [year, month, daysInMonth, startWeekday, startOfWeek]);

  const streak = useMemo(() => computeStreak(state.history), [state.history]);

  const dayInfo = (key: string) => {
    const h = state.history[key];
    if (!h || h.total === 0) return { ratio: 0, full: false, has: false };
    const ratio = h.completedRoutineIds.length / h.total;
    return { ratio, full: ratio >= 1, has: true };
  };

  const selectedDay = state.history[selected];

  return (
    <div className="min-h-full bg-background pb-24">
      <header className="safe-top sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-2 py-2">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-semibold">History</h1>
          <button
            onClick={() => navigate("/settings")}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="px-5 pt-4 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-block">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-medium">Current streak</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums flex items-center gap-2">
                {streak}
                <Flame size={20} className="text-accent" strokeWidth={2.5} />
              </p>
            </div>
            <p className="text-xs text-muted-foreground max-w-[140px] text-right">
              Days where every routine was checked off.
            </p>
          </div>
        </div>

        <MoodHistoryStrip state={state} />

        {/* Calendar */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-block">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
            >
              <ChevronDown size={18} className="rotate-90" />
            </button>
            <p className="text-sm font-bold tracking-tight">{monthLabel(cursor)}</p>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
            >
              <ChevronDown size={18} className="-rotate-90" />
            </button>
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`${year}-${month}`}
              custom={direction}
              initial={{ opacity: 0, x: direction === "right" ? 20 : direction === "left" ? -20 : 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction === "right" ? -20 : direction === "left" ? 20 : 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.x > 50) changeMonth(-1);
                else if (info.offset.x < -50) changeMonth(1);
              }}
              className="touch-pan-y"
            >
              <div className="grid grid-cols-7 gap-1 mb-2">
                {(startOfWeek === 1
                  ? ["M", "T", "W", "T", "F", "S", "S"]
                  : ["S", "M", "T", "W", "T", "F", "S"]
                ).map((d, i) => {
                  const isSunday = startOfWeek === 1 ? i === 6 : i === 0;
                  return (
                    <div key={i} className={cn("text-center text-[10px] font-semibold", isSunday ? "text-destructive" : "text-muted-foreground")}>
                      {d}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {cells.map((c, i) => {
                  if (!c.key) return <div key={i} className="aspect-square" />;
                  const info = dayInfo(c.key);
                  const isToday = c.key === todayK;
                  const isSelected = c.key === selected;
                  const isFuture = c.key > todayK;
                  return (
                    <button
                      key={i}
                      disabled={isFuture}
                      onClick={() => setSelected(c.key!)}
                      className={cn(
                        "aspect-square rounded-md text-xs font-medium relative flex items-center justify-center transition-smooth",
                        isFuture && "opacity-30",
                        !isSelected && !info.full && "hover:bg-muted",
                        info.full && "bg-success text-success-foreground",
                        info.has && !info.full && "bg-success-soft text-foreground",
                        isSelected && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
                        isToday && !info.full && "border border-foreground",
                      )}
                    >
                      {c.day}
                      {info.full && (
                        <Flame
                          size={9}
                          strokeWidth={3}
                          className="absolute -top-1 -right-1 text-accent bg-card rounded-full p-0.5"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-success" /> All done
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-success-soft" /> Partial
            </span>
            <span className="flex items-center gap-1">
              <Flame size={10} className="text-accent" /> Streak day
            </span>
          </div>
        </div>

        {/* Selected day detail */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-block">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-medium">
            {new Date(selected + "T12:00:00").toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          {!selectedDay || selectedDay.total === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No data for this day.</p>
          ) : (
            (() => {
              const completedIds = selectedDay.completedRoutineIds;
              const entries = Object.entries(selectedDay.snapshot);
              const completed = entries.filter(([rid]) => completedIds.includes(rid));
              const missed = entries.filter(([rid]) => !completedIds.includes(rid));
              const ratio = selectedDay.total === 0 ? 0 : completed.length / selectedDay.total;
              const perfect = ratio >= 1;

              return (
                <>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-2xl font-semibold tabular-nums">
                      {completed.length}
                      <span className="text-muted-foreground text-base font-medium"> / {selectedDay.total}</span>
                    </p>
                    {perfect ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                        <Flame size={11} strokeWidth={2.5} /> Streak day
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {Math.round(ratio * 100)}% complete
                      </span>
                    )}
                  </div>

                  {/* Completed routines */}
                  <div className="mt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                      Completed ({completed.length})
                    </p>
                    {completed.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No routines were completed this day.</p>
                    ) : (
                      <div className="space-y-2">
                        {completed.map(([rid, snap]) => {
                          const isExp = !!expanded[rid];
                          const tasks = (snap.blocks ?? []).filter(b => b.type === 'checkbox' && b.text?.trim());
                          
                          return (
                            <div key={rid} className="flex flex-col rounded-xl border border-success/20 bg-success-soft/40 overflow-hidden">
                              <button
                                onClick={() => toggleExpand(rid)}
                                className="flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors hover:bg-success-soft/60"
                              >
                                <span className="h-4 w-4 rounded-sm bg-success border border-success text-success-foreground flex items-center justify-center text-[10px] shrink-0">
                                  ✓
                                </span>
                                <span className="text-base leading-none shrink-0">{snap.emoji ?? "•"}</span>
                                <span className="flex-1 truncate font-semibold text-foreground">{snap.title}</span>
                                <motion.span
                                  animate={{ rotate: isExp ? 180 : 0 }}
                                  className="text-muted-foreground"
                                >
                                  <ChevronDown size={14} />
                                </motion.span>
                              </button>
                              
                              <AnimatePresence>
                                {isExp && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden bg-background/30"
                                  >
                                    <div className="px-3 pb-3 pt-1 space-y-1.5 ml-7">
                                      {tasks.length === 0 ? (
                                        <p className="text-[11px] text-muted-foreground italic">No individual tasks were recorded.</p>
                                      ) : (
                                        tasks.map(t => (
                                          <div key={t.id} className="flex items-center gap-2 text-[13px] text-foreground/80">
                                            <div className="h-1.5 w-1.5 rounded-full bg-success/60" />
                                            <span className={cn(t.checked && "line-through text-muted-foreground/60")}>
                                              {t.text}
                                            </span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Missed routines */}
                  {missed.length > 0 && (
                    <div className="mt-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                        Missed ({missed.length})
                      </p>
                      <div className="space-y-2">
                        {missed.map(([rid, snap]) => {
                          const isExp = !!expanded[rid];
                          const tasks = (snap.blocks ?? []).filter(b => b.type === 'checkbox' && b.text?.trim());

                          return (
                            <div key={rid} className="flex flex-col rounded-xl border border-border bg-muted/20 overflow-hidden opacity-80">
                              <button
                                onClick={() => toggleExpand(rid)}
                                className="flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors hover:bg-muted/40"
                              >
                                <span className="h-4 w-4 rounded-sm border border-muted-foreground/30 shrink-0" />
                                <span className="text-base leading-none shrink-0">{snap.emoji ?? "•"}</span>
                                <span className="flex-1 truncate font-medium text-muted-foreground">{snap.title}</span>
                                <motion.span
                                  animate={{ rotate: isExp ? 180 : 0 }}
                                  className="text-muted-foreground/60"
                                >
                                  <ChevronDown size={14} />
                                </motion.span>
                              </button>

                              <AnimatePresence>
                                {isExp && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-3 pb-3 pt-1 space-y-1.5 ml-7">
                                      {tasks.length === 0 ? (
                                        <p className="text-[11px] text-muted-foreground italic">No individual tasks were recorded.</p>
                                      ) : (
                                        tasks.map(t => (
                                          <div key={t.id} className="flex items-center gap-2 text-[13px] text-muted-foreground/70">
                                            <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                            <span className={cn(t.checked && "line-through")}>
                                              {t.text}
                                            </span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()
          )}
        </div>
      </main>
    </div>
  );
};

export default History;

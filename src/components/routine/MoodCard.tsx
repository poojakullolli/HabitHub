import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { MoodValue, RoutineState } from "@/lib/routine-types";
import { todayKey } from "@/lib/storage";
import { tapHaptic, successHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type Props = {
  state: RoutineState;
  onSelectMood: (mood: MoodValue) => void;
  onResetMood: () => void;
};

const MOODS: { value: MoodValue; emoji: string; label: string }[] = [
  { value: "great", emoji: "🙂", label: "Great" },
  { value: "ok", emoji: "😐", label: "OK" },
  { value: "tired", emoji: "😴", label: "Tired" },
  { value: "stressed", emoji: "😫", label: "Stressed" },
];

// Persisted across full app restarts so the chip stays after the picker is dismissed.
const DISMISS_KEY = "mood-card-dismissed-date";

const computeMoodInsight = (state: RoutineState): string | null => {
  const moods = state.moods ?? {};
  const entries = Object.entries(moods).slice(-14);
  if (entries.length < 4) return null;

  const buckets: Record<MoodValue, { sum: number; n: number }> = {
    great: { sum: 0, n: 0 },
    ok: { sum: 0, n: 0 },
    tired: { sum: 0, n: 0 },
    stressed: { sum: 0, n: 0 },
  };

  for (const [date, mood] of entries) {
    const h = state.history[date];
    if (!h || h.total === 0) continue;
    const ratio = h.completedRoutineIds.length / h.total;
    buckets[mood as MoodValue].sum += ratio;
    buckets[mood as MoodValue].n += 1;
  }

  const ratios = (Object.entries(buckets) as [MoodValue, { sum: number; n: number }][])
    .filter(([, v]) => v.n >= 1)
    .map(([k, v]) => ({ mood: k, avg: v.sum / v.n }));

  if (ratios.length < 2) return null;

  ratios.sort((a, b) => b.avg - a.avg);
  const best = ratios[0];
  const worst = ratios[ratios.length - 1];
  if (best.avg - worst.avg < 0.15) return null;

  const label = MOODS.find((m) => m.value === best.mood)?.label.toLowerCase() ?? best.mood;
  return `You complete more when you feel ${label}.`;
};

export const MoodCard = ({ state, onSelectMood, onResetMood }: Props) => {
  const today = todayKey();
  const todaysMood = state.moods?.[today];

  const lastMood: MoodValue | undefined = useMemo(() => {
    const moods = state.moods ?? {};
    const dates = Object.keys(moods).sort();
    return dates.length ? (moods[dates[dates.length - 1]] as MoodValue) : undefined;
  }, [state.moods]);

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISS_KEY) === today;
  });

  // Re-sync dismissal across days (e.g., when midnight rolls over while open)
  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY);
    if (stored && stored !== today) {
      localStorage.removeItem(DISMISS_KEY);
      setDismissed(false);
    }
  }, [today]);

  const insight = useMemo(() => computeMoodInsight(state), [state]);
  const [insightExpanded, setInsightExpanded] = useState(false);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, today);
    setDismissed(true);
    tapHaptic();
  };

  const handlePick = (mood: MoodValue) => {
    successHaptic();
    onSelectMood(mood);
  };

  const handleResetMood = () => {
    tapHaptic();
    localStorage.removeItem(DISMISS_KEY);
    setDismissed(false);
    onResetMood();
  };

  const chipMood: MoodValue | undefined =
    todaysMood ?? (dismissed ? lastMood : undefined);

  // Determine which view to render — keyed for AnimatePresence cross-fade
  const view: "chip" | "picker" | "none" = chipMood
    ? "chip"
    : dismissed
      ? "none"
      : "picker";

  const transition = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {view === "chip" && (() => {
          const selected = MOODS.find((m) => m.value === chipMood);
          return (
            <motion.div
              key="chip"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={transition}
              className="mx-5 mb-4 flex items-center gap-2"
            >
              <button
                onClick={handleResetMood}
                aria-label="Change mood"
                className={cn(
                  "flex items-center gap-2 rounded-full border border-border bg-card pl-2.5 pr-3 py-1.5",
                  "shadow-block hover:border-accent/40 active:scale-95 transition-all",
                )}
              >
                <span className="text-lg leading-none">{selected?.emoji}</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {selected?.label}
                </span>
              </button>
              {insight && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInsightExpanded((v) => !v);
                    tapHaptic();
                  }}
                  className="flex-1 flex items-center gap-1.5 rounded-2xl border border-accent/20 bg-accent/5 px-2.5 py-1.5 min-w-0 text-left active:scale-[0.98] transition-transform"
                  aria-expanded={insightExpanded}
                >
                  <Sparkles size={12} className="text-accent shrink-0" strokeWidth={2.5} />
                  <p
                    className={cn(
                      "text-[12px] text-foreground/80 leading-snug",
                      insightExpanded ? "whitespace-normal" : "truncate",
                    )}
                  >
                    {insight}
                  </p>
                </button>
              )}
            </motion.div>
          );
        })()}

        {view === "picker" && (
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={transition}
          >
            <div className="mx-5 mb-5 rounded-2xl border border-border bg-card p-4 shadow-block relative">
              <button
                onClick={handleDismiss}
                className="absolute top-2.5 right-2.5 h-7 w-7 grid place-items-center rounded-full text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>

              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-medium">
                Quick check-in
              </p>
              <h3 className="mt-1 text-[17px] font-semibold tracking-tight">How do you feel?</h3>

              <div className="mt-3 grid grid-cols-4 gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => handlePick(m.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 py-3 px-1 transition-all rounded-2xl",
                      "hover:bg-muted/50 hover:scale-110 active:scale-90",
                    )}
                  >
                    <span className="text-3xl leading-none">{m.emoji}</span>
                    <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-[0.1em]">
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>

              {insight && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent/5 border border-accent/15 px-2.5 py-1.5">
                  <Sparkles size={12} className="text-accent shrink-0" strokeWidth={2.5} />
                  <p className="text-[12px] text-foreground/80 leading-snug">{insight}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

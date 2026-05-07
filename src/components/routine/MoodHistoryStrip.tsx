import { useMemo } from "react";
import { motion } from "framer-motion";
import type { MoodValue, RoutineState } from "@/lib/routine-types";
import { todayKey } from "@/lib/storage";
import { cn } from "@/lib/utils";

const EMOJI: Record<MoodValue, string> = {
  great: "🙂",
  ok: "😐",
  tired: "😴",
  stressed: "😫",
};

const FEELING: Record<MoodValue, string> = {
  great: "happy",
  ok: "normal",
  tired: "tired",
  stressed: "stressed",
};

const dayShort = (k: string) =>
  new Date(k + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1);

type Props = { state: RoutineState };

export const MoodHistoryStrip = ({ state }: Props) => {
  const today = todayKey();

  const days = useMemo(() => {
    const out: { key: string; mood?: MoodValue; isToday: boolean }[] = [];
    const base = new Date(today + "T12:00:00");
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const k = todayKey(d);
      out.push({
        key: k,
        mood: state.moods?.[k],
        isToday: k === today,
      });
    }
    return out;
  }, [state.moods, today]);

  // Single insight: highlight the mood with the highest completion (incl. partial)
  // versus the 7-day average. Only surfaced when the gap is meaningful AND there's
  // enough data to compare across at least two distinct moods.
  const insight = useMemo<{ mood: MoodValue; text: string } | null>(() => {
    const buckets: Record<MoodValue, { sum: number; n: number }> = {
      great: { sum: 0, n: 0 },
      ok: { sum: 0, n: 0 },
      tired: { sum: 0, n: 0 },
      stressed: { sum: 0, n: 0 },
    };

    let overallSum = 0;
    let overallN = 0;

    for (const d of days) {
      if (!d.mood) continue;
      const h = state.history[d.key];
      if (!h || h.total === 0) continue;
      const ratio = Math.min(1, h.completedRoutineIds.length / h.total);
      buckets[d.mood].sum += ratio;
      buckets[d.mood].n += 1;
      overallSum += ratio;
      overallN += 1;
    }

    // Need enough data: ≥3 days with both mood + work logged, across ≥2 moods.
    const distinctMoods = (Object.values(buckets) as { sum: number; n: number }[]).filter(
      (b) => b.n > 0,
    ).length;
    if (overallN < 3 || distinctMoods < 2) return null;

    const overallAvg = overallSum / overallN;
    const ranked = (Object.entries(buckets) as [MoodValue, { sum: number; n: number }][])
      .filter(([, b]) => b.n > 0)
      .map(([mood, b]) => ({ mood, avg: b.sum / b.n }))
      .sort((a, b) => b.avg - a.avg);

    const top = ranked[0];
    const diff = top.avg - overallAvg;
    // Threshold: must beat the overall average by ≥12 percentage points to surface.
    if (diff < 0.12) return null;

    const intensity = diff >= 0.25 ? "a lot more" : "more";
    return {
      mood: top.mood,
      text: `You did ${intensity} work when you felt ${FEELING[top.mood]}.`,
    };
  }, [days, state.history]);


  const hasAny = days.some((d) => d.mood);
  if (!hasAny) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-block">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-medium">
        Mood · last 7 days
      </p>
      <div className="mt-3 flex items-end justify-between gap-1">
        {days.map((d, i) => (
          <motion.div
            key={d.key}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.25 }}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <div
              className={cn(
                "h-9 w-9 grid place-items-center rounded-xl text-lg leading-none transition-colors",
                d.mood ? "bg-muted/60" : "bg-muted/20 text-muted-foreground/30",
                d.isToday && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
              )}
            >
              {d.mood ? EMOJI[d.mood] : "·"}
            </div>
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.1em]",
                d.isToday ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {dayShort(d.key)}
            </span>
          </motion.div>
        ))}
      </div>

      {insight && (
        <div className="mt-4 flex items-start gap-2 border-t border-border pt-3">
          <span className="text-sm leading-5 shrink-0">{EMOJI[insight.mood]}</span>
          <p className="text-[12.5px] leading-5 text-foreground/80">{insight.text}</p>
        </div>
      )}
    </div>
  );
};

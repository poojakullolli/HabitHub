import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { RoutineState } from "@/lib/routine-types";
import { ArrowRight } from "lucide-react";

type Props = {
  state: RoutineState;
  onAccept: () => void;
  onDismiss: () => void;
};

/**
 * Smart Carry Forward — appears once when day rolls over with unfinished tasks.
 * Lets user choose to carry tasks to today (preserving streaks) or skip
 * (breaking streaks for those routines).
 */
export const CarryForwardDialog = ({ state, onAccept, onDismiss }: Props) => {
  const carry = state.pendingCarryForward;
  if (!carry) return null;

  // Build list of routine titles + counts of unfinished items
  const items = carry.items
    .map((i) => {
      const r = state.routines.find((x) => x.id === i.routineId);
      if (!r) return null;
      return { title: r.title, emoji: r.emoji, count: i.blockIds.length };
    })
    .filter(Boolean) as { title: string; emoji?: string; count: number }[];

  const totalUnfinished = items.reduce((acc, x) => acc + x.count, 0);
  if (items.length === 0 || totalUnfinished === 0) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="rounded-[28px] p-7 gap-5 max-w-[90vw] sm:max-w-md">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-serif font-bold text-left">
            Carry over to today?
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-left text-[14px] leading-relaxed">
            You had <span className="font-semibold text-foreground">{totalUnfinished} unfinished task{totalUnfinished === 1 ? "" : "s"}</span> from yesterday. Move them to today and keep your streak alive?
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-1.5 max-h-48 overflow-y-auto -mx-1 px-1">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm"
            >
              {it.emoji && <span className="text-base leading-none shrink-0">{it.emoji}</span>}
              <span className="flex-1 font-medium truncate">{it.title}</span>
              <span className="shrink-0 rounded-full bg-background border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
                {it.count} left
              </span>
            </li>
          ))}
        </ul>

        <DialogFooter className="flex flex-row gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={onDismiss}
            className="flex-1 rounded-2xl h-12 font-semibold border-border/60 hover:bg-muted"
          >
            Skip
          </Button>
          <Button
            onClick={onAccept}
            className="flex-1 rounded-2xl h-12 font-bold bg-foreground text-background hover:bg-foreground/90 shadow-elevated"
          >
            Move to today
            <ArrowRight size={16} strokeWidth={2.5} className="ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

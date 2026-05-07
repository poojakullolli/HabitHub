import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
import { CalendarDays, GripVertical, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoutines } from "@/hooks/useRoutines";
import { ProgressHeader } from "@/components/routine/ProgressHeader";
import { SectionBlock } from "@/components/routine/SectionBlock";
import { CarryForwardDialog } from "@/components/routine/CarryForwardDialog";
import { MoodCard } from "@/components/routine/MoodCard";
import { TemplateLibrary } from "@/components/routine/TemplateLibrary";
import { CompletionCelebration } from "@/components/routine/CompletionCelebration";
import type { Routine, RoutineBlockContent } from "@/lib/routine-types";
import { uid } from "@/lib/utils";
import { tapHaptic } from "@/lib/haptics";

// Module-level flag: the FAB "New Section → +" intro animation only plays
// the first time the app mounts in this session, not on every Home navigation.
let fabIntroPlayed = false;

const Index = () => {
  const r = useRoutines();
  const navigate = useNavigate();
  const [reorderMode, setReorderMode] = useState(false);
  const [showFullButton, setShowFullButton] = useState(() => !fabIntroPlayed);
  const [showCelebration, setShowCelebration] = useState(false);
  const [prevCompleted, setPrevCompleted] = useState(r.completed);

  useEffect(() => {
    if (
      r.total > 0 &&
      r.completed === r.total &&
      prevCompleted < r.total &&
      (r.state.settings as any)?.completionCelebration !== false
    ) {
      setShowCelebration(true);
      tapHaptic();
    }
    setPrevCompleted(r.completed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.completed, r.total]);

  useEffect(() => {
    if (fabIntroPlayed) return;
    const timer = setTimeout(() => {
      setShowFullButton(false);
      fabIntroPlayed = true;
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!reorderMode) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-reorder-keep="true"]')) return;
      setReorderMode(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [reorderMode]);

  const sortedRoutines = [...r.state.routines].sort((a, b) => a.order - b.order);
  const [order, setOrder] = useState<Routine[]>(sortedRoutines);
  
  useEffect(() => {
    setOrder(sortedRoutines);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.state.routines]);

  const newRoutine = (routineId?: string) => {
    if (routineId) {
      navigate(`/routine/${routineId}`);
      return;
    }
    navigate("/routine/new");
  };

  const handleAddTemplate = (t: any) => {
    const sectionId = r.state.sections[0]?.id || r.addSection("Routines");
    
    // Find or create a routine by title (helper for nested templates)
    const findOrCreateRoutine = (routineTitle: string): string => {
      const existing = r.state.routines.find(x => x.title.toLowerCase() === routineTitle.toLowerCase());
      if (existing) return existing.id;
      
      // Look for a template with this title
      const template = (TemplateLibrary as any).TEMPLATES?.find((tmp: any) => tmp.title.toLowerCase() === routineTitle.toLowerCase());
      if (template) {
        const depBlocks = template.blocks.map((b: any) => ({ ...b, id: uid() }));
        return r.addRoutine({
          title: template.title,
          emoji: template.emoji,
          description: template.description,
          sectionId,
          blocks: depBlocks,
        });
      }
      
      // Fallback: Create a blank one
      return r.addRoutine({ title: routineTitle, sectionId, blocks: [] });
    };

    const blocks: RoutineBlockContent[] = t.blocks.map((b: any) => {
      const newBlock = { ...b, id: uid() };
      if (b.type === "routine" && b.text) {
        newBlock.linkedRoutineId = findOrCreateRoutine(b.text);
      }
      return newBlock;
    });

    r.addRoutine({
      title: t.title,
      emoji: t.emoji,
      description: t.description,
      sectionId,
      blocks,
    });
    tapHaptic();
  };

  const handleReorder = (next: Routine[]) => {
    setOrder(next);
    r.reorderRoutines(next.map((s) => s.id));
  };

  return (
    <div className="min-h-full bg-background pb-32">
      <CompletionCelebration
        show={showCelebration}
        onDone={() => setShowCelebration(false)}
      />
      <ProgressHeader
        completed={r.completed}
        total={r.total}
        globalStreak={r.globalStreak}
        onOpenHistory={() => navigate("/history")}
      />

      <MoodCard state={r.state} onSelectMood={r.setMood} onResetMood={r.clearMood} />

      <CarryForwardDialog
        state={r.state}
        onAccept={r.acceptCarryForward}
        onDismiss={r.dismissCarryForward}
      />

      <main className="px-4">
        <Reorder.Group axis="y" values={order} onReorder={handleReorder} className="space-y-6">
          {order.map((routine) => (
            <SectionReorderItem
              key={routine.id}
              routine={routine}
              reorderMode={reorderMode}
              onToggleReorder={() => setReorderMode((v) => !v)}
              onToggleCollapsed={r.toggleRoutineCollapsed}
              onAdd={() => newRoutine(routine.id)}
              onDeleteSection={r.deleteRoutine}
              onToggleRoutine={r.toggleRoutine}
              onDeleteRoutine={r.deleteRoutine}
              setRoutineBlocks={r.setRoutineBlocks}
            />
          ))}
        </Reorder.Group>

        {r.total > 0 && (
          <p className="text-center text-xs text-muted-foreground pt-6">
            Tap the + button to add/edit items · Drag handles to reorder
          </p>
        )}

        <TemplateLibrary onAdd={handleAddTemplate} />
      </main>

      {/* Floating Action: History + New */}
      <div
        className="fixed right-5 bottom-6 z-40 flex items-end flex-col gap-3"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <button
          onClick={() => navigate("/history")}
          className="flex items-center justify-center rounded-full bg-card border border-border text-foreground h-14 w-14 shadow-elevated active:scale-95 transition-transform"
          aria-label="History"
        >
          <CalendarDays size={22} />
        </button>
        <motion.button
          onClick={() => newRoutine()}
          initial={false}
          animate={{ width: showFullButton ? "auto" : 56 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center h-14 rounded-full bg-foreground text-background shadow-elevated overflow-hidden px-4 hover:opacity-90 active:scale-95"
          aria-label="Add routine"
        >
          <Plus size={22} strokeWidth={2.5} className="shrink-0" />
          <AnimatePresence initial={false}>
            {showFullButton && (
              <motion.span
                key="label"
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: "auto", marginLeft: 8 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="text-sm font-semibold whitespace-nowrap pr-1.5"
              >
                New Section
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
};

type ItemProps = {
  routine: Routine;
  reorderMode: boolean;
  onToggleReorder: () => void;
  onToggleCollapsed: (id: string) => void;
  onAdd: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onToggleRoutine: (id: string) => void;
  onDeleteRoutine: (id: string) => void;
  setRoutineBlocks: ReturnType<typeof useRoutines>["setRoutineBlocks"];
};

const SectionReorderItem = ({ routine, reorderMode, ...rest }: ItemProps) => {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={routine}
      dragListener={false}
      dragControls={controls}
      className="relative"
    >
      {reorderMode && (
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="absolute -left-1 top-1.5 z-10 p-1 text-muted-foreground/60 hover:text-foreground touch-none cursor-grab active:cursor-grabbing"
          data-reorder-keep="true"
          aria-label={`Drag ${routine.title}`}
        >
          <GripVertical size={14} />
        </button>
      )}
      <div className={reorderMode ? "pl-5" : "pl-0"}>
        <SectionBlock routine={routine} {...rest} />
      </div>
    </Reorder.Item>
  );
};

export default Index;

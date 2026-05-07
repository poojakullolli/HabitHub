import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, GripVertical, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import type { Routine } from "@/lib/routine-types";

// Shared animation config — used by all section open/close transitions
// and routine card stagger so timing/easing stay perfectly in sync.
const SECTION_EASE = [0.32, 0.72, 0, 1] as const;
const SECTION_DURATION = 0.45;
const CARD_DURATION = 0.28;
const STAGGER = 0.04;
const STAGGER_DELAY = 0.04;
import { RoutineCheckbox } from "./RoutineCheckbox";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { completionHaptic, successHaptic, tapHaptic } from "@/lib/haptics";
import { useState } from "react";
import { Link as LinkIcon, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uid } from "@/lib/utils";

type Props = {
  routine: Routine;
  onToggleCollapsed: (id: string) => void;
  onAdd: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onToggleReorder: () => void;
  setRoutineBlocks: (id: string, blocks: Routine["blocks"]) => void;
};

export const SectionBlock = ({
  routine,
  onToggleCollapsed,
  onAdd,
  onDeleteSection,
  onToggleReorder,
  setRoutineBlocks,
}: Props) => {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [recentlyCheckedIds, setRecentlyCheckedIds] = useState<Set<string>>(new Set());
  const allBlocks = (routine.blocks ?? []).filter((b) => (b.type === "checkbox" || b.type === "timer") && b.text?.trim());
  const done = allBlocks.filter((b) => b.checked).length;
  
  // Priority: show unchecked tasks first, then cap at 4.
  // Items in recentlyCheckedIds stay visible as "unchecked" for 0.7s to avoid jarring jumps.
  const visibleBlocks = [...allBlocks]
    .sort((a, b) => {
      const aIsDone = a.checked && !recentlyCheckedIds.has(a.id);
      const bIsDone = b.checked && !recentlyCheckedIds.has(b.id);
      if (aIsDone === bIsDone) return 0;
      return aIsDone ? 1 : -1;
    })
    .slice(0, 4);
    
  const remainingCount = allBlocks.length - visibleBlocks.length;

  const handleToggleCheckbox = (blockId: string) => {
    const isChecking = !(routine.blocks ?? []).find(b => b.id === blockId)?.checked;
    
    if (isChecking) {
      setRecentlyCheckedIds(prev => new Set(prev).add(blockId));
      setTimeout(() => {
        setRecentlyCheckedIds(prev => {
          const next = new Set(prev);
          next.delete(blockId);
          return next;
        });
      }, 700);
    }

    const updatedBlocks = (routine.blocks ?? []).map((b) => {
      if (b.id === blockId) {
        if (!b.checked) successHaptic();
        else tapHaptic();
        return { ...b, checked: !b.checked };
      }
      return b;
    });
    // Detect "just completed everything" transition → stronger haptic
    const checks = updatedBlocks.filter((b) => (b.type === "checkbox" || b.type === "timer") && b.text?.trim());
    const wasAllDone = allBlocks.length > 0 && allBlocks.every((b) => b.checked);
    const isAllDone = checks.length > 0 && checks.every((b) => b.checked);
    if (!wasAllDone && isAllDone) completionHaptic();
    setRoutineBlocks(routine.id, updatedBlocks);
  };

  const handleQuickAdd = () => {
    const text = newTaskText.trim();
    if (!text) return;
    const newBlock = { id: uid(), type: "checkbox" as const, text, checked: false };
    setRoutineBlocks(routine.id, [...(routine.blocks ?? []), newBlock]);
    successHaptic();
    setNewTaskText("");
    setAddOpen(false);
  };


  return (
    <section className="flex flex-col">
      <header className="flex items-center gap-2 px-1 group">
        <button
          onClick={() => onToggleCollapsed(routine.id)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <motion.span
            animate={{ rotate: routine.collapsed ? -90 : 0 }}
            transition={{ duration: SECTION_DURATION, ease: SECTION_EASE }}
            className="text-muted-foreground"
          >
            <ChevronDown size={16} />
          </motion.span>
          {routine.emoji && <span className="text-lg leading-none">{routine.emoji}</span>}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight truncate">{routine.title}</h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {done}/{allBlocks.length}
              </span>
            </div>
          </div>
        </button>
        <button
          onClick={() => setAddOpen(true)}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-smooth"
          aria-label="Add task"
        >
          <Plus size={16} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-smooth"
              aria-label="Section options"
            >
              <MoreHorizontal size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 size={14} className="mr-2" /> Delete section
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onToggleReorder}>
              <GripVertical size={14} className="mr-2" /> Reorder sections
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-[28px] p-8 gap-6 max-w-[90vw] sm:max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-serif font-bold text-center sm:text-left">Delete section?</DialogTitle>
            <DialogDescription className="text-muted-foreground text-center sm:text-left text-[15px]">
              This will permanently delete "{routine.title}" and all tasks inside it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setDeleteOpen(false)}
              className="flex-1 rounded-2xl h-12 font-bold border-border/60 hover:bg-muted"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                onDeleteSection(routine.id);
                setDeleteOpen(false);
              }}
              className="flex-1 rounded-2xl h-12 font-bold shadow-lg shadow-destructive/20"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) setNewTaskText("");
        }}
      >
        <DialogContent className="rounded-[28px] p-7 gap-5 max-w-[90vw] sm:max-w-md">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-serif font-bold text-left flex items-center gap-2">
              {routine.emoji && <span>{routine.emoji}</span>}
              Add task
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-[14px] text-left">
              Quick-add a new task to "{routine.title}".
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleQuickAdd();
              }
            }}
            placeholder="e.g. Drink a glass of water"
            className="h-12 rounded-xl text-[15px]"
          />
          <DialogFooter className="flex flex-row gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              className="flex-1 rounded-2xl h-12 font-bold border-border/60 hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuickAdd}
              disabled={!newTaskText.trim()}
              className="flex-1 rounded-2xl h-12 font-bold"
            >
              Add task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AnimatePresence initial={false}>
        {!routine.collapsed && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: SECTION_DURATION, ease: SECTION_EASE },
              opacity: { duration: SECTION_DURATION, ease: SECTION_EASE },
            }}
            style={{ overflow: "hidden" }}
          >
            {/* Inner wrapper: flex+gap (not space-y) so margins don't clip
                during height animation, and pt provides top breathing room
                that's included in the measured height. */}
            <div className="flex flex-col gap-1.5 pt-3 pb-1">
              {allBlocks.length === 0 && (
                <button
                  onClick={() => onAdd(routine.id)}
                  className="w-full text-left text-sm text-muted-foreground rounded-xl border border-dashed border-border px-3.5 py-3 hover:bg-muted/50 transition-smooth"
                >
                  + Add tasks inside this section
                </button>
              )}
              
              <AnimatePresence initial={false} mode="popLayout">
                {visibleBlocks.map((b) => (
                  <motion.div
                    key={b.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 shadow-block transition-colors",
                      b.checked && "bg-success-soft/40 border-success/20",
                    )}
                  >
                    <div className="shrink-0">
                      <RoutineCheckbox
                        checked={!!b.checked}
                        onChange={() => handleToggleCheckbox(b.id)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/routine/${routine.id}`)}
                      className="flex-1 min-w-0 text-left select-none"
                    >
                      <span
                        className={cn(
                          "font-medium text-[15px] leading-snug truncate transition-colors",
                          b.checked && "line-through text-muted-foreground",
                        )}
                      >
                        {b.text || "Untitled Task"}
                      </span>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {remainingCount > 0 && (
                <button
                  onClick={() => navigate(`/routine/${routine.id}`)}
                  className="text-[11px] text-muted-foreground/60 font-bold tracking-wider pl-1 mt-1 hover:text-foreground transition-colors uppercase"
                >
                  + {remainingCount} more tasks
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

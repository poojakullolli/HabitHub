import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import type { Routine } from "@/lib/routine-types";
import { RoutineCheckbox } from "./RoutineCheckbox";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  routine: Routine;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export const RoutineBlock = ({ routine, onToggle, onDelete }: Props) => {
  const navigate = useNavigate();
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleToggle = () => {
    if (!routine.isCompleted) successHaptic();
    else tapHaptic();
    onToggle(routine.id);
  };

  const startPress = () => {
    longPressed.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      tapHaptic();
      setDeleteOpen(true);
    }, 550);
  };
  const endPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
  };

  const openDetail = () => {
    if (longPressed.current) return;
    navigate(`/routine/${routine.id}`);
  };

  const confirmDelete = () => {
    setDeleteOpen(false);
    onDelete(routine.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "relative flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 shadow-block transition-colors",
        routine.isCompleted && "bg-success-soft/40 border-success/20",
      )}
    >
      <div className="shrink-0">
        <RoutineCheckbox checked={routine.isCompleted} onChange={handleToggle} />
      </div>

      <button
        type="button"
        onClick={openDetail}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onPointerCancel={endPress}
        onContextMenu={(e) => e.preventDefault()}
        className="flex-1 min-w-0 text-left select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          {routine.emoji && <span className="text-base leading-none shrink-0">{routine.emoji}</span>}
          <span
            className={cn(
              "font-medium text-[15px] leading-snug truncate transition-colors",
              routine.isCompleted && "line-through text-muted-foreground",
            )}
          >
            {routine.title}
          </span>
        </div>
        {routine.description && (
          <p className="mt-0.5 text-[13px] text-muted-foreground line-clamp-1">{routine.description}</p>
        )}
      </button>

      {/* Streak chip — reserved fixed width so layout never shifts */}
      <div className="shrink-0 min-w-[44px] flex justify-end">
        {routine.streakCount > 0 && (
          <div
            className="flex items-center gap-0.5 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent"
            title={`${routine.streakCount} day streak`}
          >
            <Flame size={12} strokeWidth={2.5} />
            {routine.streakCount}
          </div>
        )}
      </div>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete routine?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{routine.title}" and its progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

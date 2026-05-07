import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  checked: boolean;
  onChange: () => void;
  size?: number;
};

export const RoutineCheckbox = ({ checked, onChange, size = 22 }: Props) => {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={checked ? "Mark as incomplete" : "Mark as complete"}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={cn(
        "relative shrink-0 rounded-md border transition-smooth flex items-center justify-center",
        checked
          ? "bg-success border-success text-success-foreground"
          : "bg-background border-input hover:border-foreground/40",
      )}
      style={{ width: size, height: size }}
    >
      <motion.span
        initial={false}
        animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="flex items-center justify-center"
      >
        <Check size={size * 0.7} strokeWidth={3} />
      </motion.span>
    </button>
  );
};

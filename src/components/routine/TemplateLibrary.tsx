import { Sparkles, Plus, ChevronDown, EyeOff, Eye, CheckSquare, Minus, Quote, Link2, ListTree } from "lucide-react";
import { RoutineBlockContent } from "@/lib/routine-types";
import { tapHaptic, successHaptic } from "@/lib/haptics";
import { cn, uid } from "@/lib/utils";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Template = {
  title: string;
  emoji: string;
  description: string;
  blocks: Omit<RoutineBlockContent, "id">[];
};

export const TEMPLATES: Template[] = [
  {
    title: "Study Session",
    emoji: "📚",
    description: "Deep focus block for learning.",
    blocks: [
      { type: "subheading", text: "Session setup" },
      { type: "checkbox", text: "Phone on Do Not Disturb", checked: false },
      { type: "checkbox", text: "Water + snack ready", checked: false },
      { type: "checkbox", text: "Topic written down", checked: false },
      { type: "divider" },
      { type: "subheading", text: "Learning blocks" },
      { type: "checkbox", text: "Pomodoro 1 — 25 min", checked: false },
      { type: "checkbox", text: "Break — 5 min", checked: false },
      { type: "checkbox", text: "Pomodoro 2 — 25 min", checked: false },
      { type: "checkbox", text: "Break — 5 min", checked: false },
      { type: "divider" },
      { type: "subheading", text: "Key takeaways" },
      { type: "bullet", text: "First main concept from session" },
      { type: "bullet", text: "Second thing I learned" },
      { type: "bullet", text: "Questions to revisit tomorrow" },
      { type: "divider" },
      { type: "link", text: "Khan Academy", url: "https://khanacademy.org" },
      { type: "link", text: "My notes folder", url: "https://drive.google.com" },
    ],
  },
  {
    title: "Fitness",
    emoji: "💪",
    description: "Full workout from warm-up to cooldown.",
    blocks: [
      { type: "quote", text: "The only bad workout is the one that didn't happen." },
      { type: "divider" },
      { type: "subheading", text: "Warm up" },
      { type: "checkbox", text: "Jumping jacks — 2 min", checked: false },
      { type: "checkbox", text: "Arm circles + hip rolls", checked: false },
      { type: "checkbox", text: "Light jog on spot", checked: false },
      { type: "divider" },
      { type: "subheading", text: "Strength" },
      { type: "checkbox", text: "Push ups — 3 × 15", checked: false },
      { type: "checkbox", text: "Squats — 3 × 20", checked: false },
      { type: "checkbox", text: "Plank — 3 × 45s", checked: false },
      { type: "checkbox", text: "Lunges — 3 × 12 each", checked: false },
      { type: "divider" },
      { type: "subheading", text: "Cardio (optional)" },
      { type: "checkbox", text: "15 min run or cycle", checked: false },
      { type: "divider" },
      { type: "quote", text: "Action is the foundational key to all success." },
      { type: "subheading", text: "Cool down" },
      { type: "checkbox", text: "Stretching — 10 min", checked: false },
      { type: "checkbox", text: "2L water goal", checked: false },
    ],
  },
  {
    title: "Deep Work",
    emoji: "💻",
    description: "Protect your most productive hours.",
    blocks: [
      { type: "subheading", text: "Before you start" },
      { type: "checkbox", text: "Single task written down", checked: false },
      { type: "checkbox", text: "All notifications off", checked: false },
      { type: "checkbox", text: "Workspace cleared", checked: false },
      { type: "divider" },
      { type: "subheading", text: "Work blocks" },
      { type: "checkbox", text: "Block 1 — 90 min", checked: false },
      { type: "checkbox", text: "Break — 15 min (walk)", checked: false },
      { type: "checkbox", text: "Block 2 — 90 min", checked: false },
      { type: "divider" },
      { type: "subheading", text: "Rules during work" },
      { type: "bullet", text: "No social media or news" },
      { type: "bullet", text: "Only task-related tabs open" },
      { type: "bullet", text: "Write blockers, don't solve them now" },
      { type: "divider" },
      { type: "subheading", text: "End of session review" },
      { type: "checkbox", text: "Task completed or % done noted", checked: false },
      { type: "checkbox", text: "Tomorrow's first task written", checked: false },
    ],
  },
  {
    title: "Wind Down",
    emoji: "🌙",
    description: "Prepare your mind for restful sleep.",
    blocks: [
      { type: "subheading", text: "Digital detox" },
      { type: "checkbox", text: "All screens off", checked: false },
      { type: "checkbox", text: "Phone in other room", checked: false },
      { type: "divider" },
      { type: "subheading", text: "Deep session" },
      { type: "routine", text: "Deep Work" },
      { type: "divider" },
      { type: "subheading", text: "Reflection" },
      { type: "checkbox", text: "Plan top 3 for tomorrow", checked: false },
      { type: "checkbox", text: "Journal: 3 wins today", checked: false },
      { type: "divider" },
      { type: "subheading", text: "Rest" },
      { type: "checkbox", text: "Light stretching", checked: false },
      { type: "checkbox", text: "Read fiction (paper book)", checked: false },
    ],
  },
];

type Props = {
  onAdd: (template: Template) => void;
};

const COLLAPSED_KEY = "routine_templates_collapsed";

export const TemplateLibrary = ({ onAdd }: Props) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  });
  const [isPermanentlyHidden, setIsPermanentlyHidden] = useState(() => {
    return localStorage.getItem("routine_templates_hidden") === "true";
  });
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  if (isPermanentlyHidden) return null;

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, next ? "true" : "false");
      return next;
    });
  };

  const handleHide = () => {
    localStorage.setItem("routine_templates_hidden", "true");
    setIsPermanentlyHidden(true);
    tapHaptic();
  };

  return (
    <div className="mt-12 mb-8 px-1">
      <motion.button
        layout="position"
        onClick={() => {
          tapHaptic();
          toggleCollapsed();
        }}
        className="flex items-center gap-2 mb-5 group w-full text-left outline-none"
      >
        <motion.div
          animate={{ rotate: isCollapsed ? -90 : 0 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          className="text-muted-foreground/40 group-hover:text-accent transition-colors"
        >
          <ChevronDown size={14} strokeWidth={3} />
        </motion.div>
        <Sparkles size={14} className="text-accent" strokeWidth={2.5} />
        <motion.h3 
          layout="position"
          className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 group-hover:text-foreground transition-colors"
        >
          Template Library
        </motion.h3>
      </motion.button>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 0.25, ease: "linear" },
            }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pb-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.title}
                  onClick={() => {
                    tapHaptic();
                    setPreviewTemplate(t);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3.5 p-3 rounded-2xl border border-border bg-card text-left transition-all",
                    "hover:border-accent/40 hover:shadow-block active:scale-[0.98] group",
                  )}
                >
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {t.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[15px] text-foreground leading-tight">{t.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {t.description}
                    </p>
                  </div>
                  <div className="h-8 w-8 shrink-0 rounded-full bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all">
                    <Eye size={15} strokeWidth={2.5} />
                  </div>
                </button>
              ))}

              <div className="flex justify-center pt-6 pb-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 hover:text-destructive transition-colors outline-none group">
                      <EyeOff size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      Hide Template Library
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[28px] p-8 gap-6 max-w-[90vw] sm:max-w-md">
                    <AlertDialogHeader className="space-y-3">
                      <AlertDialogTitle className="text-2xl font-serif font-bold text-center sm:text-left">Hide the Library?</AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground text-center sm:text-left text-[15px]">
                        This will remove the Template Library from your dashboard. You can always bring it back later from settings.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-row gap-3 sm:justify-end">
                      <AlertDialogCancel className="flex-1 rounded-2xl h-12 font-bold border-border/60 hover:bg-muted">Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleHide}
                        className="flex-1 rounded-2xl h-12 font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20"
                      >
                        Hide
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={!!previewTemplate} onOpenChange={(o) => !o && setPreviewTemplate(null)}>
        <DialogContent className="rounded-[28px] p-0 gap-0 max-w-[92vw] sm:max-w-md overflow-hidden">
          {previewTemplate && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 space-y-2 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center text-2xl">
                    {previewTemplate.emoji}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <DialogTitle className="text-xl font-serif font-bold leading-tight">
                      {previewTemplate.title}
                    </DialogTitle>
                    <DialogDescription className="text-[12px] text-muted-foreground mt-0.5">
                      {previewTemplate.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="max-h-[55vh] overflow-y-auto px-6 py-4 space-y-1.5">
                {previewTemplate.blocks.map((b, i) => (
                  <PreviewBlockRow key={i} block={b} />
                ))}
              </div>

              <DialogFooter className="flex flex-row gap-3 sm:justify-end px-6 py-4 border-t border-border bg-muted/20">
                <Button
                  variant="outline"
                  onClick={() => setPreviewTemplate(null)}
                  className="flex-1 rounded-2xl h-11 font-semibold border-border/60"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    successHaptic();
                    onAdd(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="flex-1 rounded-2xl h-11 font-bold bg-foreground text-background hover:bg-foreground/90"
                >
                  <Plus size={15} strokeWidth={3} className="mr-1" />
                  Add template
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PreviewBlockRow = ({ block }: { block: Omit<RoutineBlockContent, "id"> }) => {
  switch (block.type) {
    case "heading":
      return <div className="text-base font-bold text-foreground pt-2">{block.text}</div>;
    case "subheading":
      return (
        <div className="flex items-center gap-1.5 pt-2">
          <ListTree size={12} className="text-accent" strokeWidth={2.5} />
          <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            {block.text}
          </div>
        </div>
      );
    case "checkbox":
      return (
        <div className="flex items-center gap-2 text-[13px] text-foreground/90">
          <CheckSquare size={14} className="text-muted-foreground/60 shrink-0" strokeWidth={2} />
          <span className="truncate">{block.text}</span>
        </div>
      );
    case "bullet":
      return (
        <div className="flex items-start gap-2 text-[13px] text-foreground/80 pl-1">
          <span className="text-muted-foreground/60 mt-0.5">•</span>
          <span>{block.text}</span>
        </div>
      );
    case "quote":
      return (
        <div className="flex items-start gap-2 text-[12px] italic text-muted-foreground border-l-2 border-accent/40 pl-2.5 py-1">
          <Quote size={11} className="text-accent/60 mt-0.5 shrink-0" />
          <span>{block.text}</span>
        </div>
      );
    case "link":
      return (
        <div className="flex items-center gap-2 text-[13px] text-accent">
          <Link2 size={13} strokeWidth={2.5} className="shrink-0" />
          <span className="truncate">{block.text}</span>
        </div>
      );
    case "routine":
      return (
        <div className="flex items-center gap-2 text-[13px] font-medium text-foreground/90 rounded-lg bg-accent/5 border border-accent/10 px-2 py-1.5">
          <Sparkles size={12} className="text-accent shrink-0" strokeWidth={2.5} />
          <span className="truncate">Linked routine: {block.text}</span>
        </div>
      );
    case "divider":
      return <div className="flex items-center gap-2 py-1"><div className="flex-1 h-px bg-border" /></div>;
    default:
      return <div className="text-[13px] text-foreground/80">{block.text}</div>;
  }
};

import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Flame, Trash2, Pencil, Plus, Undo2 } from "lucide-react";
import { useRoutines } from "@/hooks/useRoutines";
import { tapHaptic } from "@/lib/haptics";
import { BlockEditor } from "@/components/routine/BlockEditor";
import { EmojiPicker } from "@/components/routine/EmojiPicker";
import type { RoutineBlockContent } from "@/lib/routine-types";
import { cn, uid } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";


const RoutineDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const r = useRoutines();

  const isNew = id === "new";
  const existing = useMemo(
    () => (isNew ? undefined : r.state.routines.find((x) => x.id === id)),
    [id, isNew, r.state.routines],
  );

  // The "section" the new routine belongs to is implicit: from URL or a default
  // single section. We never expose section selection in the UI anymore — the
  // routine title IS the visible section heading on the home page.
  const ensureDefaultSection = (): string => {
    const fromUrl = params.get("section");
    if (fromUrl && r.state.sections.find((s) => s.id === fromUrl)) return fromUrl;
    const first = [...r.state.sections].sort((a, b) => a.order - b.order)[0];
    if (first) return first.id;
    return r.addSection("Routines");
  };

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [emoji, setEmoji] = useState(existing?.emoji ?? "✨");
  const [sectionId] = useState(existing?.sectionId ?? ensureDefaultSection());
  const [blocks, setBlocks] = useState<RoutineBlockContent[]>(
    existing?.blocks ??
    (existing?.description && !existing?.blocks
      ? [{ id: "legacy", type: "text", text: existing.description }]
      : isNew
        ? [{ id: uid(), type: "checkbox", text: "", checked: false }]
        : []),
  );
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Reset history on ID change
  const [history, setHistory] = useState<{ title: string; emoji: string; blocks: RoutineBlockContent[] }[]>([]);
  const [showUndo, setShowUndo] = useState(false);
  const isUndoing = useRef(false);

  // Prevent initializing state with empty values if data isn't ready yet
  if (!isNew && !existing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Auto-hide undo button after 4 seconds
  useEffect(() => {
    if (showUndo) {
      const timer = setTimeout(() => setShowUndo(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showUndo]);

  // Track latest state for cleanup
  const stateRef = useRef({ title, description, blocks, id: existing?.id });
  useEffect(() => {
    stateRef.current = { title, description, blocks, id: existing?.id };
  }, [title, description, blocks, existing?.id]);

  // Cleanup empty routines on unmount
  useEffect(() => {
    return () => {
      const { title: fTitle, description: fDesc, blocks: fBlocks, id: fId } = stateRef.current;
      if (fId && !fTitle.trim() && !fDesc.trim()) {
        // Check if there is ANY meaningful content in blocks
        const hasContent = fBlocks.some(b => {
          if (b.type === "divider") return true;
          if (b.type === "routine") return true;
          if (b.type === "link" && b.url?.trim()) return true;
          if (b.text?.trim()) return true;
          return false;
        });

        if (!hasContent) {
          r.deleteRoutine(fId);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setEmoji(existing.emoji ?? "✨");
      setBlocks(
        existing.blocks ??
        (existing.description
          ? [{ id: "legacy", type: "text", text: existing.description }]
          : []),
      );
    }
  }, [existing]);

  useEffect(() => {
    if (!isNew && !existing && r.state.routines.length > 0) navigate("/", { replace: true });
  }, [isNew, existing, navigate, r.state.routines.length]);

  // Snapshot state before change for undo history
  const takeSnapshot = () => {
    if (isUndoing.current) return;
    setHistory(prev => [...prev, { title, emoji, blocks }].slice(-20));
  };

  const handleTitleChange = (val: string) => {
    takeSnapshot();
    setTitle(val);
    setShowUndo(true);
    if (existing) {
      r.updateRoutine(existing.id, { title: val });
    } else if (isNew && val.trim()) {
      // Auto-create routine on first title entry
      const newId = uid();
      r.addRoutine({ id: newId, title: val.trim(), description, emoji, sectionId, blocks });
      navigate(`/routine/${newId}`, { replace: true });
    }
  };

  const handleEmojiChange = (val: string) => {
    takeSnapshot();
    setEmoji(val);
    setShowUndo(false);
    if (existing) {
      r.updateRoutine(existing.id, { emoji: val });
    }
  };

  const handleDescriptionChange = (val: string) => {
    takeSnapshot();
    setDescription(val);
    setShowUndo(true);
    if (existing) {
      r.updateRoutine(existing.id, { description: val });
    }
  };

  const handleBlocksChange = (next: RoutineBlockContent[]) => {
    // Show undo for any change that isn't just a checkbox toggle
    const isOnlyCheckboxToggle = next.length === blocks.length && next.every((nb, i) => {
      const ob = blocks[i];
      return ob && nb.id === ob.id && nb.text === ob.text && nb.type === ob.type;
    });

    takeSnapshot();
    setBlocks(next);
    setShowUndo(!isOnlyCheckboxToggle);
    if (existing) r.setRoutineBlocks(existing.id, next);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    isUndoing.current = true;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setShowUndo(false);

    setTitle(prev.title);
    setEmoji(prev.emoji);
    setBlocks(prev.blocks);

    if (existing) {
      r.updateRoutine(existing.id, {
        title: prev.title,
        emoji: prev.emoji,
        blocks: prev.blocks
      });
    }

    setTimeout(() => {
      isUndoing.current = false;
    }, 100);
    tapHaptic();
  };

  const save = () => {
    if (!title.trim() || !sectionId) return;
    const firstText = blocks.find((b) => ["text", "quote", "subheading"].includes(b.type) && b.text?.trim());
    const displayDescription = description.trim() || firstText?.text?.trim() || undefined;

    if (isNew) {
      r.addRoutine({ title: title.trim(), description: displayDescription, emoji, sectionId, blocks });
    } else if (existing) {
      r.updateRoutine(existing.id, {
        title: title.trim(),
        description: displayDescription,
        emoji,
        sectionId,
        blocks,
      });
    }
    tapHaptic();
    navigate("/");
  };

  const remove = () => {
    if (!existing) return;
    r.deleteRoutine(existing.id);
    navigate("/");
  };

  return (
    <div className="min-h-full bg-background pb-32">
      <header className="safe-top sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/40 transition-smooth">
        <div className="flex items-center justify-between px-3 h-16">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-full bg-muted/30 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-smooth"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-1.5">
            {existing && (() => {
              let done = 0;
              let total = 0;
              
              const countTasks = (blkList: RoutineBlockContent[]) => {
                blkList.forEach(b => {
                  if (b.type === 'checkbox') {
                    total++;
                    if (b.checked) done++;
                  } else if (b.type === 'routine' && b.linkedRoutineId) {
                    const linked = r.state.routines.find(x => x.id === b.linkedRoutineId);
                    if (linked?.blocks) countTasks(linked.blocks);
                  }
                });
              };
              
              countTasks(blocks);
              
              if (total === 0) return null;
              
              return (
                <div className="h-9 flex items-center gap-1.5 rounded-full bg-accent/10 px-3 text-[11px] font-black text-accent border border-accent/20">
                  <Flame size={13} strokeWidth={3} className="fill-accent/20" />
                  {done}
                </div>
              );
            })()}
            {existing && (
              <button
                onClick={() => setDeleteOpen(true)}
                className="h-9 w-9 rounded-full bg-muted/30 border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-smooth"
                aria-label="Delete"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-10 space-y-8">
        <div className="relative space-y-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setEmojiOpen(true)}
              className="group relative flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
              aria-label="Change icon"
            >
              <span className="relative z-10 text-3xl leading-none">{emoji}</span>
              <div className="absolute -inset-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-background/90 p-1 rounded-full shadow-block border border-border">
                  <Plus size={10} className="text-foreground" />
                </div>
              </div>
            </button>

            <div className="flex-1 min-w-0 space-y-1">
              <input
                autoFocus={isNew}
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Routine Name"
                className="w-full bg-transparent border-0 outline-none text-3xl font-serif font-bold tracking-tight placeholder:text-muted-foreground/30 text-foreground"
              />
              <input
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Start every day with intention."
                className="w-full bg-transparent border-0 outline-none text-sm font-medium italic text-muted-foreground/60 placeholder:text-muted-foreground/20"
              />
            </div>
          </div>
        </div>

        <BlockEditor blocks={blocks} onChange={handleBlocksChange} editable={true} currentRoutineId={id} />
      </main>

      {/* Floating Undo Button */}
      <AnimatePresence>
        {showUndo && history.length > 0 && (
          <motion.button
            layout
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            onClick={handleUndo}
            className="fixed right-6 z-50 flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2.5 shadow-elevated transition-transform hover:scale-105 active:scale-95"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
          >
            <Undo2 size={16} strokeWidth={2.5} />
            <span className="text-sm font-bold">Undo</span>
          </motion.button>
        )}
      </AnimatePresence>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-[28px] p-8 gap-6 max-w-[90vw] sm:max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-serif font-bold text-center sm:text-left">Delete routine?</DialogTitle>
            <DialogDescription className="text-muted-foreground text-center sm:text-left text-[15px]">
              This will permanently delete "{existing?.title}" and its progress. This action cannot be undone.
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
              onClick={remove}
              className="flex-1 rounded-2xl h-12 font-bold shadow-lg shadow-destructive/20"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmojiPicker
        open={emojiOpen}
        value={emoji}
        onClose={() => setEmojiOpen(false)}
        onSelect={handleEmojiChange}
      />
    </div>
  );
};

export default RoutineDetail;

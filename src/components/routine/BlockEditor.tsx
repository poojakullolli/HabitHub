import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heading1,
  Heading2,
  Type,
  List,
  CheckSquare,
  Minus,
  Quote,
  Link as LinkIcon,
  Plus,
  X,
  Check,
  Layers,
  ChevronRight,
  ExternalLink,
  Settings2,
  Link2Off,
  Flame,
  Timer as TimerIcon,
  Play,
  Pause,
  RotateCcw,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import type { BlockType, RoutineBlockContent } from "@/lib/routine-types";
import { cn } from "@/lib/utils";
import { completionHaptic, successHaptic, tapHaptic } from "@/lib/haptics";
import { RoutineCheckbox } from "./RoutineCheckbox";
import { useRoutines } from "@/hooks/useRoutines";
import { useNavigate } from "react-router-dom";

const uid = () => Math.random().toString(36).slice(2, 10);

const blockMenu: { type: BlockType; label: string; icon: typeof Type }[] = [
  { type: "text", label: "Text", icon: Type },
  { type: "heading", label: "Heading", icon: Heading1 },
  { type: "subheading", label: "Subheading", icon: Heading2 },
  { type: "checkbox", label: "To-do", icon: CheckSquare },
  { type: "timer", label: "Timer", icon: TimerIcon },
  { type: "bullet", label: "Bullet list", icon: List },
  { type: "routine", label: "Routine", icon: Layers },
  { type: "link", label: "Link", icon: LinkIcon },
  { type: "divider", label: "Divider", icon: Minus },
  { type: "quote", label: "Quote", icon: Quote },
];

type Props = {
  blocks: RoutineBlockContent[];
  onChange: (next: RoutineBlockContent[]) => void;
  editable: boolean;
  currentRoutineId?: string;
};

export const BlockEditor = ({ blocks, onChange, editable, currentRoutineId }: Props) => {
  const [toolboxOpen, setToolboxOpen] = useState(false);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [focusedCursorPos, setFocusedCursorPos] = useState<number | null>(null);

  const addBlock = (type: BlockType, afterIndex?: number) => {
    const nb: RoutineBlockContent = {
      id: uid(),
      type,
      text: "",
      checked: (type === "checkbox" || type === "timer") ? false : undefined,
      durationSeconds: type === "timer" ? 60 : undefined,
    };
    const next = [...blocks];
    const at = afterIndex === undefined ? next.length : afterIndex + 1;
    next.splice(at, 0, nb);
    setFocusedBlockId(nb.id);
    setFocusedCursorPos(0);
    onChange(next);
    setToolboxOpen(false);
  };

  const handleEnter = (index: number) => {
    const block = blocks[index];
    const nextBlock = blocks[index + 1];
    if (nextBlock && nextBlock.type === block.type) {
      setFocusedBlockId(nextBlock.id);
      setFocusedCursorPos(0);
    } else if (block.text?.trim()) {
      const continueTypes: BlockType[] = ["bullet", "checkbox", "text"];
      addBlock(continueTypes.includes(block.type) ? block.type : "text", index);
    }
  };

  const mergeWithPrevious = (index: number) => {
    const current = blocks[index];
    if (index === 0) {
      if (!current.text) {
        onChange(blocks.filter((_, i) => i !== 0));
      }
      return;
    }
    const prev = blocks[index - 1];
    
    // Special case: If the previous block is a divider, just remove the divider
    if (prev.type === "divider") {
      const next = blocks.filter((_, i) => i !== index - 1);
      onChange(next);
      return;
    }

    const prevText = prev.text ?? "";
    const currentText = current.text ?? "";
    
    const next = blocks.map((b, i) => {
      if (i === index - 1) {
        return { ...b, text: prevText + currentText };
      }
      return b;
    }).filter((_, i) => i !== index);
    
    setFocusedBlockId(prev.id);
    setFocusedCursorPos(prevText.length);
    onChange(next);
  };

  const updateBlock = (id: string, patch: Partial<RoutineBlockContent>) => {
    const next = blocks.map((b) => (b.id === id ? { ...b, ...patch } : b));
    // Detect "all checkboxes just became complete" → stronger haptic
    if ("checked" in patch) {
      const prevChecks = blocks.filter((b) => (b.type === "checkbox" || b.type === "timer") && b.text?.trim());
      const nextChecks = next.filter((b) => (b.type === "checkbox" || b.type === "timer") && b.text?.trim());
      const wasAll = prevChecks.length > 0 && prevChecks.every((b) => b.checked);
      const isAll = nextChecks.length > 0 && nextChecks.every((b) => b.checked);
      if (!wasAll && isAll) completionHaptic();
    }
    onChange(next);
  };

  const removeBlock = (id: string) => onChange(blocks.filter((b) => b.id !== id));

  return (
    <div className="space-y-1">
      {blocks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3 rounded-2xl border-2 border-dashed border-border/50 bg-muted/20">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <List size={24} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">No tasks yet</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              {editable ? "Use the toolbox below to start building your routine." : "This routine has no content yet."}
            </p>
          </div>
        </div>
      )}

      {blocks.map((b, i) => {
        const prevTasksComplete = blocks
          .slice(0, i)
          .filter((x) => (x.type === "checkbox" || x.type === "timer") && x.text?.trim())
          .every((x) => !!x.checked);
        return (
          <BlockRow
            key={b.id}
            block={b}
            editable={editable}
            isFocused={b.id === focusedBlockId}
            cursorPos={b.id === focusedBlockId ? focusedCursorPos : undefined}
            currentRoutineId={currentRoutineId}
            prevTasksComplete={prevTasksComplete}
            onUpdate={(patch) => updateBlock(b.id, patch)}
            onRemove={() => removeBlock(b.id)}
            onEnter={() => handleEnter(i)}
            onMergeWithPrevious={() => mergeWithPrevious(i)}
          />
        );
      })}

      {/* Add-block toolbox — only in edit mode */}
      {editable && (
        <div className="pt-6">
          {!toolboxOpen ? (
            <button
              type="button"
              onClick={() => setToolboxOpen(true)}
              className="group flex items-center justify-center w-full gap-2 rounded-xl border border-dashed border-border py-4 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-muted/50 transition-smooth active:scale-[0.98]"
            >
              <Plus size={16} strokeWidth={2.5} className="text-muted-foreground/60 group-hover:text-foreground transition-colors" />
              Add block
            </button>
          ) : (
            <div className="rounded-2xl border border-border bg-card shadow-elevated p-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Quick Add
                </p>
                <button
                  type="button"
                  onClick={() => setToolboxOpen(false)}
                  className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
                  aria-label="Close toolbox"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {blockMenu.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.type}
                      type="button"
                      onClick={() => addBlock(m.type)}
                      className="group flex flex-row items-center gap-3 rounded-xl border border-border bg-background p-2.5 text-[13px] font-bold text-foreground hover:bg-muted hover:border-accent/30 hover:text-accent transition-all active:scale-[0.97]"
                    >
                      <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center group-hover:bg-accent/10 shrink-0 transition-colors">
                        <Icon size={16} strokeWidth={2.5} className="text-muted-foreground/80 group-hover:text-accent transition-colors" />
                      </div>
                      <span className="truncate">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

type RowProps = {
  block: RoutineBlockContent;
  editable: boolean;
  isFocused?: boolean;
  cursorPos?: number | null;
  currentRoutineId?: string;
  prevTasksComplete?: boolean;
  onUpdate: (patch: Partial<RoutineBlockContent>) => void;
  onRemove: () => void;
  onEnter: () => void;
  onMergeWithPrevious: () => void;
};

const BlockRow = ({ block, editable, isFocused, cursorPos, currentRoutineId, prevTasksComplete = true, onUpdate, onRemove, onEnter, onMergeWithPrevious }: RowProps) => {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [localIsEditing, setLocalIsEditing] = useState(false);
  const [showUnlink, setShowUnlink] = useState(false);
  const [recentlyCheckedIds, setRecentlyCheckedIds] = useState<Set<string>>(new Set());
  const longPressTimer = useRef<number | null>(null);
  
  const { state: routineState, addRoutine, setRoutineBlocks } = useRoutines();
  const navigate = useNavigate();
  
  const linkedRoutine = routineState.routines.find(r => r.id === block.linkedRoutineId);

  const toggleLinkedBlock = (blockId: string) => {
    if (!linkedRoutine) return;
    const isChecking = !(linkedRoutine.blocks ?? []).find(b => b.id === blockId)?.checked;
    
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

    const nextBlocks = (linkedRoutine.blocks ?? []).map(b => 
      b.id === blockId ? { ...b, checked: !b.checked } : b
    );
    setRoutineBlocks(linkedRoutine.id, nextBlocks);
    tapHaptic();
  };

  const startLongPress = () => {
    longPressTimer.current = window.setTimeout(() => {
      tapHaptic();
      setShowUnlink(true);
    }, 600); // 600ms for long press
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "0px";
    el.style.height = el.scrollHeight + "px";
  };

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
      if (typeof cursorPos === "number") {
        inputRef.current.selectionStart = cursorPos;
        inputRef.current.selectionEnd = cursorPos;
      }
    }
  }, [isFocused, cursorPos]);

  useEffect(() => {
    autoGrow(inputRef.current);
  }, [block.text, editable, localIsEditing]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (!editable) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnter();
    }
    if (e.key === "Backspace" && e.currentTarget.selectionStart === 0) {
      e.preventDefault();
      
      // If it's a special block (checkbox, heading, etc), convert it to text first
      // instead of immediately merging and losing the tool type.
      if (block.type !== "text") {
        onUpdate({ type: "text" });
        return;
      }
      
      onMergeWithPrevious();
    }
  };

  const ro = !editable;

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 py-1 transition-all",
      )}
    >
      <div className="flex-1 min-w-0">
        {block.type === "divider" ? (
          <div className="py-0 group relative">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
            {!ro && (
              <button
                type="button"
                onClick={onRemove}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-muted/80 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ) : block.type === "checkbox" ? (
          <div className="flex items-start gap-3 py-1">
            <div className="mt-0.5">
              <RoutineCheckbox
                checked={!!block.checked}
                onChange={() => {
                  if (!block.checked && !prevTasksComplete && !ro) {
                    tapHaptic();
                    toast("Complete previous tasks first", {
                      description: "Finish the tasks above before checking this one.",
                    });
                    return;
                  }
                  if (!block.checked) successHaptic();
                  else tapHaptic();
                  onUpdate({ checked: !block.checked });
                }}
                size={20}
              />
            </div>
            <div className="relative flex-1 min-w-0">
              <textarea
                ref={inputRef}
                rows={1}
                readOnly={ro}
                value={block.text ?? ""}
                onChange={(e) => {
                  onUpdate({ text: e.target.value });
                  autoGrow(e.target);
                }}
                onInput={(e) => autoGrow(e.currentTarget)}
                onKeyDown={handleKey}
                placeholder="What needs to be done?"
                className={cn(
                  "w-full bg-transparent border-0 outline-none resize-none text-[15px] font-medium leading-snug transition-all",
                  block.checked ? "text-muted-foreground/60" : "text-foreground",
                  ro && "cursor-default",
                )}
              />
              <AnimatePresence>
                {block.checked && (
                  <div className="absolute inset-0 pointer-events-none flex items-start">
                    <div className="relative inline-flex">
                      <span className="opacity-0 whitespace-pre text-[15px] font-medium leading-snug select-none">
                        {block.text || " "}
                      </span>
                      <motion.div
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        exit={{ scaleX: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                        className="absolute left-0 right-0 top-[0.7em] h-[1.5px] bg-muted-foreground/60 origin-left"
                      />
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : block.type === "timer" ? (
          <TimerBlock
            block={block}
            editable={editable}
            prevTasksComplete={prevTasksComplete}
            onUpdate={onUpdate}
          />
        ) : block.type === "bullet" ? (
          <div className="flex items-start gap-3 py-1">
            <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-accent/60 shrink-0" />
            <textarea
              ref={inputRef}
              rows={1}
              readOnly={ro}
              value={block.text ?? ""}
              onChange={(e) => {
                onUpdate({ text: e.target.value });
                autoGrow(e.target);
              }}
              onInput={(e) => autoGrow(e.currentTarget)}
              onKeyDown={handleKey}
              placeholder="List item"
              className={cn(
                "flex-1 bg-transparent border-0 outline-none resize-none text-[15px] leading-snug",
                ro && "cursor-default",
              )}
            />
          </div>
        ) : block.type === "heading" ? (
          <textarea
            ref={inputRef}
            rows={1}
            readOnly={ro}
            value={block.text ?? ""}
            onChange={(e) => {
              onUpdate({ text: e.target.value });
              autoGrow(e.target);
            }}
            onInput={(e) => autoGrow(e.currentTarget)}
            onKeyDown={handleKey}
            placeholder="Heading"
            className={cn(
              "w-full bg-transparent border-0 outline-none resize-none text-[26px] font-serif font-bold tracking-tight leading-tight pt-4 pb-1",
              ro && "cursor-default",
            )}
          />
        ) : block.type === "subheading" ? (
          <textarea
            ref={inputRef}
            rows={1}
            readOnly={ro}
            value={block.text ?? ""}
            onChange={(e) => {
              onUpdate({ text: e.target.value });
              autoGrow(e.target);
            }}
            onInput={(e) => autoGrow(e.currentTarget)}
            onKeyDown={handleKey}
            placeholder="Subheading"
            className={cn(
              "w-full bg-transparent border-0 outline-none resize-none text-[17px] font-semibold tracking-tight leading-snug pt-2 pb-0.5 text-foreground/90",
              ro && "cursor-default",
            )}
          />
        ) : block.type === "quote" ? (
          <div className="border-l-[3px] border-accent/40 pl-4 py-1 my-1">
            <textarea
              ref={inputRef}
              rows={1}
              readOnly={ro}
              value={block.text ?? ""}
              onChange={(e) => {
                onUpdate({ text: e.target.value });
                autoGrow(e.target);
              }}
              onInput={(e) => autoGrow(e.currentTarget)}
              onKeyDown={handleKey}
              placeholder="Add a note or reminder…"
              className={cn(
                "w-full bg-transparent border-0 outline-none resize-none text-[15px] leading-relaxed italic text-muted-foreground",
                ro && "cursor-default",
              )}
            />
          </div>
        ) : block.type === "link" ? (
          <div className="flex flex-col gap-1 py-0.5">
            <div 
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border border-border bg-card shadow-sm transition-all group",
                !localIsEditing ? "hover:border-accent/40 active:scale-[0.98] cursor-pointer" : ""
              )}
              onClick={() => {
                if (!localIsEditing && block.url) {
                  tapHaptic();
                  window.open(block.url, "_blank");
                }
              }}
            >
              <div className={cn(
                "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 overflow-hidden",
                block.url ? "bg-white shadow-sm border border-border/40" : "bg-accent/5 border border-accent/10 text-accent"
              )}>
                {block.url ? (
                  <img 
                    src={`https://www.google.com/s2/favicons?sz=128&domain=${(() => {
                      try { return new URL(block.url).hostname; } catch { return ""; }
                    })()}`}
                    className="w-7 h-7 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.classList.add('bg-accent/5', 'border-accent/10', 'text-accent');
                      e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
                    }}
                    alt=""
                  />
                ) : (
                  <LinkIcon size={18} strokeWidth={2.5} />
                )}
              </div>
              
              <div className="flex-1 min-w-0 space-y-0.5">
                {localIsEditing ? (
                  <>
                    <input
                      autoFocus
                      value={block.text ?? ""}
                      onChange={(e) => onUpdate({ text: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && setLocalIsEditing(false)}
                      placeholder="Link title"
                      className="w-full bg-transparent border-0 outline-none text-[15px] font-bold text-foreground placeholder:text-muted-foreground/30"
                    />
                    <input
                      value={block.url ?? ""}
                      onChange={(e) => onUpdate({ url: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && setLocalIsEditing(false)}
                      placeholder="https://..."
                      className="w-full bg-transparent border-0 outline-none text-[12px] text-muted-foreground placeholder:text-muted-foreground/20"
                    />
                  </>
                ) : (
                  <>
                    <p className="text-[15px] font-bold text-foreground leading-tight truncate">{block.text || "Untitled Link"}</p>
                    <p className="text-[12px] text-muted-foreground truncate opacity-60">
                      {block.url ? (() => {
                        try { return new URL(block.url).hostname; } catch { return block.url; }
                      })() : "No link"}
                    </p>
                  </>
                )}
              </div>
              
              {editable && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    tapHaptic();
                    setLocalIsEditing(!localIsEditing);
                  }}
                  className={cn(
                    "h-8 w-8 shrink-0 rounded-full flex items-center justify-center border transition-all shadow-sm",
                    localIsEditing 
                      ? "bg-accent text-white border-accent shadow-accent/20" 
                      : "bg-muted/30 border-border/50 text-muted-foreground/50 hover:text-accent hover:bg-accent/10 hover:border-accent/20"
                  )}
                  title={localIsEditing ? "Save changes" : "Edit link"}
                >
                  {localIsEditing ? <Check size={14} strokeWidth={3} /> : <Settings2 size={14} strokeWidth={2.5} />}
                </button>
              )}
            </div>
          </div>
        ) : block.type === "routine" ? (
          <div className="flex flex-col gap-1 py-0.5">
            {block.linkedRoutineId && linkedRoutine ? (
              <div className="relative group">
                <div 
                  className={cn(
                    "p-3 rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-accent/40 hover:shadow-md active:scale-[0.98] cursor-pointer group flex flex-col gap-2.5",
                    showUnlink && "blur-[2px] pointer-events-none"
                  )}
                  onPointerDown={startLongPress}
                  onPointerUp={cancelLongPress}
                  onPointerLeave={cancelLongPress}
                  onClick={() => {
                    if (!showUnlink) {
                      tapHaptic();
                      navigate(`/routine/${block.linkedRoutineId}`);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center text-2xl">
                      {linkedRoutine.emoji || "✨"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-foreground leading-tight truncate">{linkedRoutine.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/5 border border-accent/10 text-accent/80 shrink-0">
                      <Flame size={12} fill="currentColor" className="opacity-80" />
                      <span className="text-[11px] font-bold tabular-nums">
                        {(linkedRoutine.blocks ?? []).filter(b => b.type === 'checkbox' && b.checked).length}
                      </span>
                    </div>
                    <ChevronRight size={16} className="mt-1 text-muted-foreground/30 group-hover:text-accent transition-colors shrink-0" />
                  </div>
                  
                  {/* Focus Preview Tasks - Moved below the header for better left alignment */}
                  {linkedRoutine.blocks && (
                    <div className="pl-1 space-y-2" onClick={(e) => e.stopPropagation()}>
                      {linkedRoutine.blocks
                        .filter(b => b.type === 'checkbox' && (!b.checked || recentlyCheckedIds.has(b.id)))
                        .slice(0, 3)
                        .map(b => (
                          <div key={b.id} className="flex items-center gap-2.5 group/task">
                            <button
                              onClick={() => toggleLinkedBlock(b.id)}
                              className={cn(
                                "h-4 w-4 rounded-sm border flex items-center justify-center transition-colors hover:border-accent text-[10px] shrink-0",
                                b.checked ? "bg-success border-success text-success-foreground" : "border-muted-foreground/30"
                              )}
                            >
                              {b.checked && "✓"}
                            </button>
                            <span className="text-[13.5px] font-medium text-muted-foreground/90 truncate leading-tight">
                              {b.text}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {showUnlink && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-2xl border border-destructive/20"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            tapHaptic();
                            onUpdate({ linkedRoutineId: undefined, text: "" });
                            setShowUnlink(false);
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold shadow-lg shadow-destructive/20 active:scale-95 transition-transform"
                        >
                          <Link2Off size={16} />
                          Unlink Routine
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowUnlink(false);
                          }}
                          className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="relative p-4 rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 flex flex-col items-center gap-3">
                <button
                  onClick={onRemove}
                  className="absolute top-3 right-3 h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all"
                  aria-label="Cancel"
                >
                  <X size={14} />
                </button>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest pt-1">Select Routine to link</p>
                <div className="w-full max-h-48 overflow-y-auto space-y-1">
                  {routineState.routines.filter(r => r.id !== currentRoutineId).map(r => (
                    <button
                      key={r.id}
                      onClick={() => onUpdate({ linkedRoutineId: r.id, text: r.title })}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-accent/10 transition-colors text-left"
                    >
                      <span className="text-xl">{r.emoji}</span>
                      <span className="text-sm font-medium">{r.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <textarea
            ref={inputRef}
            rows={1}
            readOnly={ro}
            value={block.text ?? ""}
            onChange={(e) => {
              onUpdate({ text: e.target.value });
              autoGrow(e.target);
            }}
            onInput={(e) => autoGrow(e.currentTarget)}
            onKeyDown={handleKey}
            placeholder="Start typing…"
            className={cn(
              "w-full bg-transparent border-0 outline-none resize-none text-[15px] leading-relaxed text-muted-foreground/95 py-1",
              ro && "cursor-default",
            )}
          />
        )}
      </div>
    </div>
  );
};

type TimerBlockProps = {
  block: RoutineBlockContent;
  editable: boolean;
  prevTasksComplete: boolean;
  onUpdate: (patch: Partial<RoutineBlockContent>) => void;
};

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const TimerBlock = ({ block, editable, prevTasksComplete, onUpdate }: TimerBlockProps) => {
  const duration = block.durationSeconds ?? 60;
  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(false);
  const [editingDuration, setEditingDuration] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Reset remaining when duration changes (and not running)
  useEffect(() => {
    if (!running) setRemaining(duration);
  }, [duration, running]);

  // Auto-stop & complete when reaches 0
  useEffect(() => {
    if (running && remaining <= 0) {
      setRunning(false);
      if (!block.checked) {
        successHaptic();
        onUpdate({ checked: true });
      }
    }
  }, [remaining, running]);

  // Tick
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running]);

  // If prev tasks become incomplete (e.g. unchecked), pause
  useEffect(() => {
    if (!prevTasksComplete && running) setRunning(false);
  }, [prevTasksComplete, running]);

  const handlePlayPause = () => {
    if (block.checked) return;
    if (!prevTasksComplete) {
      tapHaptic();
      toast("Complete previous tasks first", {
        description: "Finish the tasks above before starting this timer.",
      });
      return;
    }
    tapHaptic();
    setRunning((r) => !r);
  };

  const handleReset = () => {
    tapHaptic();
    setRunning(false);
    setRemaining(duration);
    if (block.checked) onUpdate({ checked: false });
  };

  const handleCheckboxClick = () => {
    if (!block.checked) {
      if (!prevTasksComplete) {
        tapHaptic();
        toast("Complete previous tasks first", {
          description: "Finish the tasks above before completing this timer.",
        });
        return;
      }
      successHaptic();
      setRunning(false);
      setRemaining(0);
      onUpdate({ checked: true });
    } else {
      tapHaptic();
      setRemaining(duration);
      onUpdate({ checked: false });
    }
  };

  const progress = duration > 0 ? 1 - remaining / duration : 0;
  const locked = !prevTasksComplete && !block.checked;

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2 px-3 rounded-xl border bg-card transition-colors",
        block.checked ? "border-success/30 bg-success-soft/30" : "border-border",
        locked && "opacity-60",
      )}
    >
      <div className="mt-0.5">
        <RoutineCheckbox checked={!!block.checked} onChange={handleCheckboxClick} size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <input
          readOnly={!editable}
          value={block.text ?? ""}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Timer task"
          className={cn(
            "w-full bg-transparent border-0 outline-none text-[15px] font-medium leading-snug",
            block.checked && "line-through text-muted-foreground",
          )}
        />
        <div className="mt-1 flex items-center gap-2">
          {editingDuration && editable ? (
            <input
              type="number"
              min={1}
              autoFocus
              defaultValue={Math.round(duration / 60)}
              onBlur={(e) => {
                const mins = Math.max(1, parseInt(e.target.value || "1", 10));
                onUpdate({ durationSeconds: mins * 60 });
                setEditingDuration(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="w-14 bg-muted/40 rounded-md px-1.5 py-0.5 text-[12px] tabular-nums outline-none border border-border"
            />
          ) : (
            <button
              type="button"
              onClick={() => editable && !running && !block.checked && setEditingDuration(true)}
              className="flex items-center gap-1 text-[12px] tabular-nums font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <TimerIcon size={12} strokeWidth={2.5} />
              {formatTime(running || remaining !== duration ? remaining : duration)}
            </button>
          )}
          {locked && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              <Lock size={10} /> Locked
            </span>
          )}
        </div>
        {(running || (remaining !== duration && !block.checked)) && (
          <div className="mt-1.5 h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>

      {!block.checked && (
        <div className="flex items-center gap-1 shrink-0">
          {(running || remaining !== duration) && (
            <button
              type="button"
              onClick={handleReset}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Reset timer"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={handlePlayPause}
            disabled={locked}
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-95",
              locked
                ? "bg-muted text-muted-foreground/50 cursor-not-allowed"
                : running
                ? "bg-accent/20 text-accent"
                : "bg-accent text-accent-foreground shadow-sm",
            )}
            aria-label={running ? "Pause" : "Start"}
          >
            {running ? <Pause size={16} strokeWidth={2.5} /> : <Play size={16} strokeWidth={2.5} className="ml-0.5" />}
          </button>
        </div>
      )}
    </div>
  );
};


/** Read-only block renderer */
export const BlockPreview = ({ blocks }: { blocks: RoutineBlockContent[] }) => {
  const navigate = useNavigate();
  const { state: routineState, setRoutineBlocks } = useRoutines();
  const [recentlyCheckedIds, setRecentlyCheckedIds] = useState<Set<string>>(new Set());

  const toggleLinkedBlock = (routineId: string, blockId: string) => {
    const routine = routineState.routines.find(r => r.id === routineId);
    if (!routine) return;
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

    const nextBlocks = (routine.blocks ?? []).map(b => 
      b.id === blockId ? { ...b, checked: !b.checked } : b
    );
    setRoutineBlocks(routineId, nextBlocks);
    tapHaptic();
  };

  return (
    <div className="space-y-1">
      {blocks.map((b) => {
        if (b.type === "divider")
          return <div key={b.id} className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent my-2" />;
        if (b.type === "heading")
          return <h3 key={b.id} className="text-[22px] font-serif font-bold tracking-tight pt-3 pb-1">{b.text}</h3>;
        if (b.type === "subheading")
          return <h4 key={b.id} className="text-[16px] font-semibold tracking-tight pt-1 text-foreground/90">{b.text}</h4>;
        if (b.type === "bullet")
          return (
            <div key={b.id} className="flex items-start gap-2.5 py-0.5">
              <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-accent/60 shrink-0" />
              <p className="text-[15px] leading-snug">{b.text}</p>
            </div>
          );
        if (b.type === "checkbox")
          return (
            <div key={b.id} className="flex items-start gap-2.5 py-0.5">
              <span
                className={cn(
                  "mt-1 h-4 w-4 rounded-sm border flex items-center justify-center text-[10px] shrink-0",
                  b.checked ? "bg-success border-success text-success-foreground" : "border-input",
                )}
              >
                {b.checked && "✓"}
              </span>
              <p className={cn("text-[15px] leading-snug", b.checked && "line-through text-muted-foreground")}>{b.text}</p>
            </div>
          );
        if (b.type === "timer")
          return (
            <div key={b.id} className="flex items-center gap-2.5 py-0.5">
              <span
                className={cn(
                  "mt-1 h-4 w-4 rounded-sm border flex items-center justify-center text-[10px] shrink-0",
                  b.checked ? "bg-success border-success text-success-foreground" : "border-input",
                )}
              >
                {b.checked && "✓"}
              </span>
              <p className={cn("text-[15px] leading-snug flex-1", b.checked && "line-through text-muted-foreground")}>{b.text || "Timer"}</p>
              <span className="text-[12px] tabular-nums font-semibold text-muted-foreground flex items-center gap-1">
                <TimerIcon size={12} /> {formatTime(b.durationSeconds ?? 60)}
              </span>
            </div>
          );
        if (b.type === "quote")
          return (
            <p key={b.id} className="border-l-[3px] border-accent/40 pl-4 py-1 my-1 italic text-muted-foreground text-[15px] leading-relaxed">
              {b.text}
            </p>
          );
        if (b.type === "link")
          return (
            <a
              key={b.id}
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card shadow-block transition-all hover:border-accent/40 hover:shadow-elevated active:scale-[0.98] group"
            >
              <div className={cn(
                "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 overflow-hidden",
                b.url ? "bg-white shadow-sm border border-border/40" : "bg-accent/5 border border-accent/10 text-accent"
              )}>
                {b.url ? (
                  <img 
                    src={`https://www.google.com/s2/favicons?sz=128&domain=${(() => {
                      try { return new URL(b.url).hostname; } catch { return ""; }
                    })()}`}
                    className="w-7 h-7 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.classList.add('bg-accent/5', 'border-accent/10', 'text-accent');
                      e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
                    }}
                    alt=""
                  />
                ) : (
                  <LinkIcon size={18} strokeWidth={2.5} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-foreground leading-tight truncate">{b.text || "Link"}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate opacity-60">
                  {b.url ? (() => {
                    try { return new URL(b.url).hostname; } catch { return b.url; }
                  })() : "No URL"}
                </p>
              </div>
              <div className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center bg-muted/30 border border-border/50 text-muted-foreground/50 group-hover:text-accent group-hover:bg-accent/10 group-hover:border-accent/20 transition-all shadow-sm">
                <ExternalLink size={14} strokeWidth={2.5} />
              </div>
            </a>
          );
        if (b.type === "routine") {
          const linkedRoutine = routineState.routines.find((r) => r.id === b.linkedRoutineId);
          if (!linkedRoutine) return null;
          return (
            <button
              key={b.id}
              onClick={() => {
                tapHaptic();
                navigate(`/routine/${b.linkedRoutineId}`);
              }}
              className="w-full p-3 rounded-2xl border border-border bg-card shadow-block transition-all hover:border-accent/40 hover:shadow-elevated active:scale-[0.98] group flex flex-col gap-2.5"
            >
              <div className="flex items-start gap-3 w-full">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center text-2xl">
                  {linkedRoutine.emoji || "✨"}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[15px] font-bold text-foreground leading-tight truncate">
                    {linkedRoutine.title}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/5 border border-accent/10 text-accent/80 shrink-0">
                  <Flame size={12} fill="currentColor" className="opacity-80" />
                  <span className="text-[11px] font-bold tabular-nums">
                    {(linkedRoutine.blocks ?? []).filter(b => b.type === 'checkbox' && b.checked).length}
                  </span>
                </div>
                <ChevronRight
                  size={16}
                  className="mt-1 text-muted-foreground/30 group-hover:text-accent transition-colors shrink-0"
                />
              </div>

              {/* Focus Preview Tasks - Moved for left alignment */}
              {linkedRoutine.blocks && (
                <div className="pl-1 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {linkedRoutine.blocks
                    .filter(b => b.type === 'checkbox' && (!b.checked || recentlyCheckedIds.has(b.id)))
                    .slice(0, 3)
                    .map(b => (
                      <div key={b.id} className="flex items-center gap-2.5">
                        <button
                          onClick={() => toggleLinkedBlock(linkedRoutine.id, b.id)}
                          className={cn(
                            "h-4 w-4 rounded-sm border flex items-center justify-center transition-colors hover:border-accent text-[10px] shrink-0",
                            b.checked ? "bg-success border-success text-success-foreground" : "border-muted-foreground/30"
                          )}
                        >
                          {b.checked && "✓"}
                        </button>
                        <span className="text-[13.5px] font-medium text-muted-foreground/90 truncate leading-tight">
                          {b.text}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </button>
          );
        }
        return <p key={b.id} className="text-[15px] leading-relaxed text-muted-foreground/90">{b.text}</p>;
      })}
    </div>
  );
};

export type { BlockType };

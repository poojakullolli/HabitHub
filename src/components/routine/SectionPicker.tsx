import { useState } from "react";
import { ChevronDown, Plus, Check } from "lucide-react";
import type { Section } from "@/lib/routine-types";
import { cn } from "@/lib/utils";

type Props = {
  sections: Section[];
  value: string;
  onChange: (id: string) => void;
  onCreateSection: (title: string, emoji?: string) => string;
};

export const SectionPicker = ({ sections, value, onChange, onCreateSection }: Props) => {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("📁");

  const current = sections.find((s) => s.id === value);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const id = onCreateSection(newTitle.trim(), newEmoji);
    if (id) onChange(id);
    setNewTitle("");
    setNewEmoji("📁");
    setCreating(false);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 h-8 rounded-full border border-border bg-muted/60 px-3 text-xs font-medium"
      >
        <span>{current?.emoji ?? "📁"}</span>
        <span>{current?.title ?? "Section"}</span>
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setCreating(false); }} />
          <div className="absolute z-20 left-0 mt-2 w-60 rounded-xl border border-border bg-popover shadow-elevated p-1.5">
            <div className="max-h-60 overflow-y-auto">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onChange(s.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left transition-smooth",
                    value === s.id ? "bg-accent-soft text-accent font-semibold" : "hover:bg-muted",
                  )}
                >
                  <span className="text-base">{s.emoji ?? "📁"}</span>
                  <span className="flex-1 truncate">{s.title}</span>
                  {value === s.id && <Check size={14} strokeWidth={2.5} />}
                </button>
              ))}
            </div>

            <div className="h-px bg-border my-1.5" />

            {!creating ? (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-smooth"
              >
                <Plus size={14} />
                Create new section
              </button>
            ) : (
              <div className="p-1.5 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={newEmoji}
                    onChange={(e) => setNewEmoji(e.target.value.slice(0, 4))}
                    className="w-10 h-9 text-center rounded-md bg-muted border-0 text-base outline-none"
                    maxLength={4}
                  />
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    placeholder="Section name"
                    className="flex-1 h-9 rounded-md bg-muted border-0 px-2.5 text-sm outline-none"
                  />
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="flex-1 h-8 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newTitle.trim()}
                    className="flex-1 h-8 rounded-md bg-foreground text-background text-xs font-semibold disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

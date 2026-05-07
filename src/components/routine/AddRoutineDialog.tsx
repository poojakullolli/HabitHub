import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Section } from "@/lib/routine-types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sections: Section[];
  defaultSectionId?: string;
  onCreate: (data: { title: string; description?: string; emoji?: string; sectionId: string }) => void;
};

const emojiPresets = ["💧", "🧘", "🏃", "📖", "🎯", "💪", "🍎", "🌅", "🌙", "✨", "📚", "🎨"];

export const AddRoutineDialog = ({ open, onOpenChange, sections, defaultSectionId, onCreate }: Props) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState<string>("✨");
  const [sectionId, setSectionId] = useState(defaultSectionId ?? sections[0]?.id ?? "");

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setEmoji("✨");
      setSectionId(defaultSectionId ?? sections[0]?.id ?? "");
    }
  }, [open, defaultSectionId, sections]);

  const submit = () => {
    if (!title.trim() || !sectionId) return;
    onCreate({ title: title.trim(), description: description.trim() || undefined, emoji, sectionId });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">New routine</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Read 20 pages"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submit()}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A note to remind your future self"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {emojiPresets.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`h-9 w-9 rounded-md border text-lg transition-smooth ${
                    emoji === e ? "border-accent bg-accent-soft" : "border-border hover:bg-muted"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Section</label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.emoji} {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!title.trim()}>
            Add routine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

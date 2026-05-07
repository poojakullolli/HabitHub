import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (title: string, emoji?: string) => void;
};

const emojis = ["📌", "🌅", "💼", "🌙", "🏠", "💪", "🎨", "📚", "🍳", "🧠"];

export const AddSectionDialog = ({ open, onOpenChange, onCreate }: Props) => {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("📌");

  useEffect(() => {
    if (open) {
      setTitle("");
      setEmoji("📌");
    }
  }, [open]);

  const submit = () => {
    if (!title.trim()) return;
    onCreate(title.trim(), emoji);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New section</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Evening"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <div className="flex flex-wrap gap-1.5">
            {emojis.map((e) => (
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
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!title.trim()}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

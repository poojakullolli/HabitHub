import { useState } from "react";
import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const emojiGroups: { label: string; emojis: string[] }[] = [
  {
    label: "Routine",
    emojis: ["✨", "⭐", "🎯", "🔥", "💡", "🏁", "🚀", "🏆", "🎖️", "📌", "🧭", "🗓️"],
  },
  {
    label: "Health & Body",
    emojis: ["💧", "🏃", "🧘", "💪", "🚴", "🏊", "🥗", "🍎", "🥦", "🛌", "🧠", "❤️", "🦷", "🧴"],
  },
  {
    label: "Mind & Study",
    emojis: ["📖", "📚", "📝", "✏️", "🎓", "🧩", "💭", "📓", "🗞️", "🔬", "🎧", "🎼"],
  },
  {
    label: "Work",
    emojis: ["💼", "💻", "📊", "📈", "📅", "⌨️", "🖊️", "📎", "🗂️", "☎️", "📮", "🛠️"],
  },
  {
    label: "Time of day",
    emojis: ["🌅", "☀️", "🌤️", "🌙", "⭐", "🌌", "☕", "🍵", "🕰️"],
  },
  {
    label: "Creative",
    emojis: ["🎨", "🎵", "🎸", "📷", "🎬", "🎮", "✂️", "🧶", "🖌️"],
  },
  {
    label: "Life",
    emojis: ["🏠", "🧺", "🧹", "🛒", "🚗", "🐶", "🐱", "🌱", "💰", "💳", "📞", "🎁"],
  },
];

type Props = {
  open: boolean;
  value: string;
  onClose: () => void;
  onSelect: (e: string) => void;
};

export const EmojiPicker = ({ open, value, onClose, onSelect }: Props) => {
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState("");

  if (!open) return null;

  const filtered = emojiGroups
    .map((g) => ({
      ...g,
      emojis: q ? g.emojis.filter((e) => e.includes(q)) : g.emojis,
    }))
    .filter((g) => g.emojis.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[80vh] bg-popover border-t sm:border border-border rounded-t-2xl sm:rounded-2xl shadow-elevated flex flex-col animate-in slide-in-from-bottom-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Choose an icon</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted text-muted-foreground"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3 border-b border-border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Paste any emoji to filter…"
              className="w-full h-9 bg-muted/60 border-0 rounded-lg pl-9 pr-3 text-sm outline-none focus:bg-muted"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Paste your own emoji"
              className="flex-1 h-9 bg-muted/60 border-0 rounded-lg px-3 text-sm outline-none focus:bg-muted"
              maxLength={4}
            />
            <button
              type="button"
              disabled={!custom.trim()}
              onClick={() => {
                onSelect(custom.trim());
                setCustom("");
                onClose();
              }}
              className="h-9 rounded-lg bg-foreground text-background px-4 text-xs font-semibold disabled:opacity-40"
            >
              Use
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {filtered.map((g) => (
            <div key={g.label}>
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                {g.label}
              </p>
              <div className="grid grid-cols-7 gap-1">
                {g.emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      onSelect(e);
                      onClose();
                    }}
                    className={cn(
                      "aspect-square rounded-lg text-2xl flex items-center justify-center transition-smooth",
                      value === e ? "bg-accent-soft ring-1 ring-accent" : "hover:bg-muted",
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No matches</p>
          )}
        </div>
      </div>
    </div>
  );
};

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Info,
  Twitter,
  Check,
  Clock,
  CalendarDays,
  Flame,
  LayoutTemplate,
  Download,
  Upload,
  AlertTriangle,
  Trash2,
  RefreshCcw,
  BarChart3,
  FileSpreadsheet,
  Bell,
  Info as InfoIcon,
  TrendingUp,
} from "lucide-react";
import { useRoutines } from "@/hooks/useRoutines";
import { TEMPLATES } from "@/components/routine/TemplateLibrary";
import { ClockPickerDialog } from "@/components/ClockPickerDialog";
import { cn, uid } from "@/lib/utils";
import { tapHaptic, successHaptic } from "@/lib/haptics";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Eye, Plus, Sparkles, CheckSquare, Quote, Link2, ListTree } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RoutineBlockContent } from "@/lib/routine-types";
import { applyTheme, getAmoled, type ThemeMode } from "@/lib/theme";

const useTheme = () => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("theme");
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
  });
  const [amoled, setAmoledState] = useState<boolean>(() => getAmoled());
  useEffect(() => {
    applyTheme(mode, amoled);
  }, [mode, amoled]);
  return {
    mode,
    amoled,
    setTheme: (m: ThemeMode) => {
      localStorage.setItem("theme", m);
      setMode(m);
      tapHaptic();
    },
    setAmoled: (v: boolean) => {
      localStorage.setItem("amoled", v ? "1" : "0");
      setAmoledState(v);
      tapHaptic();
    },
  };
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-bold px-1 mt-7 mb-2.5">
    {children}
  </h3>
);

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-2xl border border-border bg-card overflow-hidden", className)}>{children}</div>
);

const Row = ({
  icon: Icon,
  label,
  hint,
  right,
  onClick,
  destructive,
  last,
}: {
  icon: any;
  label: string;
  hint?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  last?: boolean;
}) => {
  const Wrapper: any = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
        onClick && "hover:bg-muted/60 cursor-pointer",
        !last && "border-b border-border",
        destructive && "text-destructive"
      )}
    >
      <Icon size={18} className={cn("shrink-0", destructive ? "text-destructive" : "text-muted-foreground")} />
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium truncate">{label}</div>
        {hint && <div className="text-[12px] text-muted-foreground truncate">{hint}</div>}
      </div>
      {right}
    </Wrapper>
  );
};

const Settings = () => {
  const navigate = useNavigate();
  const r = useRoutines();
  const { mode, setTheme, amoled, setAmoled } = useTheme();

  const settings = r.state.settings ?? {};
  const resetHour = settings.resetHour ?? 0;
  const resetMinute = (settings as any).resetMinute ?? 0;
  const startOfWeek = settings.startOfWeek ?? 1;
  const streakGoal = settings.streakGoal ?? 7;
  const dailyReminder = (settings as any).dailyReminder ?? false;
  const reminderHour = (settings as any).reminderHour ?? 7;
  const reminderMinute = (settings as any).reminderMinute ?? 0;
  const streakReminder = (settings as any).streakReminder ?? true;
  const completionCelebration = (settings as any).completionCelebration ?? true;

  const updateSettings = (patch: Partial<NonNullable<typeof r.state.settings>>) => {
    const next = { ...r.state, settings: { ...settings, ...patch } };
    localStorage.setItem("daily-routine-os/v1", JSON.stringify(next));
    window.dispatchEvent(new Event("routines:updated"));
  };

  const [resetOpen, setResetOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [previewTpl, setPreviewTpl] = useState<typeof TEMPLATES[number] | null>(null);
  const [resetStreaksOpen, setResetStreaksOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [clockOpen, setClockOpen] = useState(false);
  const [reminderClockOpen, setReminderClockOpen] = useState(false);
  const [customStreakEditing, setCustomStreakEditing] = useState(false);
  const [customStreakRaw, setCustomStreakRaw] = useState("");
  const [importConfirm, setImportConfirm] = useState<{ data: any; routines: number; sections: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let cur: string[] = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; }
          else inQuotes = false;
        } else cell += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ",") { cur.push(cell); cell = ""; }
        else if (ch === "\n" || ch === "\r") {
          if (ch === "\r" && text[i + 1] === "\n") i++;
          cur.push(cell); cell = "";
          if (cur.some((c) => c.length)) rows.push(cur);
          cur = [];
        } else cell += ch;
      }
    }
    if (cell.length || cur.length) { cur.push(cell); rows.push(cur); }
    return rows;
  };

  const buildStateFromCSV = (text: string) => {
    // Strip BOM
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error("CSV is empty");
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);
    const iDate = idx("date");
    const iRoutine = idx("routine");
    const iTask = idx("task");
    const iType = idx("type");
    const iDone = idx("completed");
    const iMood = idx("mood");
    if (iDate < 0 || iRoutine < 0) {
      throw new Error("CSV must include 'date' and 'routine' columns");
    }
    // Start from current state to preserve routines/sections
    const base = JSON.parse(localStorage.getItem("daily-routine-os/v1") ?? "{}") || {};
    const history: Record<string, any> = { ...(base.history ?? {}) };
    const moods: Record<string, string> = { ...(base.moods ?? {}) };
    // Map routine title → id (existing or generated)
    const titleToId: Record<string, string> = {};
    for (const rt of base.routines ?? []) titleToId[rt.title] = rt.id;
    const genId = () => "r-" + Math.random().toString(36).slice(2, 10);

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const date = (row[iDate] || "").trim();
      if (!date) continue;
      const routineTitle = (row[iRoutine] || "").trim();
      const taskText = iTask >= 0 ? (row[iTask] || "").trim() : "";
      const type = iType >= 0 ? (row[iType] || "").trim().toLowerCase() : (taskText ? "task" : "routine");
      const done = iDone >= 0 ? /^(yes|true|1|y)$/i.test((row[iDone] || "").trim()) : false;
      const mood = iMood >= 0 ? (row[iMood] || "").trim() : "";
      if (mood) moods[date] = mood;
      if (!routineTitle) continue;
      const rid = titleToId[routineTitle] || (titleToId[routineTitle] = genId());
      if (!history[date]) history[date] = { date, completedRoutineIds: [], snapshot: {}, total: 0 };
      const day = history[date];
      if (!day.snapshot[rid]) day.snapshot[rid] = { title: routineTitle, blocks: [] };
      const snap = day.snapshot[rid];
      if (type === "task" && taskText) {
        snap.blocks.push({ id: "b-" + Math.random().toString(36).slice(2, 8), type: "checkbox", text: taskText, checked: done });
      } else if (type === "routine") {
        if (done && !day.completedRoutineIds.includes(rid)) day.completedRoutineIds.push(rid);
      }
    }
    // Recompute totals
    for (const k of Object.keys(history)) {
      const ids = Object.keys(history[k].snapshot ?? {});
      history[k].total = ids.length;
    }
    return { ...base, history, moods, routines: base.routines ?? [], sections: base.sections ?? [{ id: "s-default", name: "Routines" }] };
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    const isCSV = /\.csv$/i.test(file.name) || file.type === "text/csv";
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        let data: any;
        if (isCSV) {
          data = buildStateFromCSV(text);
        } else {
          data = JSON.parse(text);
          if (!data || typeof data !== "object" || !Array.isArray(data.routines) || !Array.isArray(data.sections)) {
            throw new Error("Invalid backup file");
          }
        }
        setImportConfirm({
          data,
          routines: (data.routines ?? []).length,
          sections: (data.sections ?? []).length,
        });
      } catch (err: any) {
        setImportError(err?.message || "Couldn't read this file. Make sure it's a valid backup JSON or CSV.");
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!importConfirm) return;
    localStorage.setItem("daily-routine-os/v1", JSON.stringify(importConfirm.data));
    window.dispatchEvent(new Event("routines:updated"));
    successHaptic();
    setImportConfirm(null);
    window.location.href = "/";
  };

  const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const formatTime = (h: number, m: number = 0) => {
    const am = h < 12;
    const hh = h % 12 === 0 ? 12 : h % 12;
    const mm = m.toString().padStart(2, "0");
    return `${hh}:${mm} ${am ? "AM" : "PM"}`;
  };

  // Keep legacy formatHour for any other callers
  const formatHour = (h: number) => formatTime(h, 0);

  const RESET_PRESETS = [
    { label: "Midnight", sub: "12:00 AM", hour: 0, minute: 0 },
    { label: "Early Bird", sub: "5:00 AM", hour: 5, minute: 0 },
    { label: "Morning", sub: "6:00 AM", hour: 6, minute: 0 },
    { label: "Late Morning", sub: "9:00 AM", hour: 9, minute: 0 },
  ];

  const isCustomSelected = !RESET_PRESETS.some(
    (p) => p.hour === resetHour && p.minute === resetMinute
  );

  const handleClockConfirm = (h: number, m: number) => {
    updateSettings({ resetHour: h, resetMinute: m } as any);
    tapHaptic();
  };

  const handleAddTemplate = (t: typeof TEMPLATES[number]) => {
    const sectionId = r.state.sections[0]?.id || r.addSection("Routines");
    const blocks: RoutineBlockContent[] = t.blocks.map((b) => ({ ...b, id: uid() }));
    r.addRoutine({ title: t.title, emoji: t.emoji, description: t.description, sectionId, blocks });
    successHaptic();
    setTplOpen(false);
  };

  const handleExport = () => {
    const data = localStorage.getItem("daily-routine-os/v1") ?? "{}";
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-routines-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    successHaptic();
  };

  const handleExportCSV = () => {
    const esc = (v: any) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows: string[][] = [[
      "date", "weekday", "routine", "task", "type", "completed", "mood",
    ]];
    const history = r.state.history ?? {};
    const moods = r.state.moods ?? {};
    const dates = Object.keys(history).sort();
    for (const date of dates) {
      const h: any = history[date];
      const weekday = new Date(date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long" });
      const mood = moods[date] ?? "";
      const snap = h.snapshot ?? {};
      const ids = Object.keys(snap);
      if (ids.length === 0) {
        rows.push([date, weekday, "", "", "", "", mood]);
        continue;
      }
      for (const rid of ids) {
        const s: any = snap[rid];
        const blocks = (s.blocks ?? []).filter((b: any) => (b.type === "checkbox" || b.type === "timer") && b.text?.trim());
        if (blocks.length === 0) {
          const completed = (h.completedRoutineIds ?? []).includes(rid) ? "yes" : "no";
          rows.push([date, weekday, s.title ?? "", "", "routine", completed, mood]);
        } else {
          for (const b of blocks) {
            rows.push([date, weekday, s.title ?? "", b.text ?? "", "task", b.checked ? "yes" : "no", mood]);
          }
        }
      }
    }
    const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-routines-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    successHaptic();
  };

  const handleResetStreaks = () => {
    const next = {
      ...r.state,
      routines: r.state.routines.map((x) => ({ ...x, streakCount: 0, lastCompletedDate: undefined })),
    };
    localStorage.setItem("daily-routine-os/v1", JSON.stringify(next));
    window.dispatchEvent(new Event("routines:updated"));
    successHaptic();
    setResetStreaksOpen(false);
  };

  const handleDeleteAll = () => {
    localStorage.removeItem("daily-routine-os/v1");
    localStorage.removeItem("template-library-collapsed");
    successHaptic();
    setDeleteAllOpen(false);
    window.location.href = "/";
  };

  return (
    <div className="min-h-full bg-background pb-20">
      <header className="safe-top px-5 pb-3 pt-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-serif font-bold">Settings</h1>
      </header>

      <main className="px-5">
        <SectionLabel>Appearance</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border transition-all",
                  active
                    ? "border-foreground bg-foreground/5"
                    : "border-border bg-card hover:bg-muted/60"
                )}
              >
                <Icon size={18} />
                <span className="text-[12px] font-semibold">{opt.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-2.5 rounded-2xl border border-border bg-card px-4 py-3.5 flex items-center gap-3">
          <Moon size={18} className="text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-medium">AMOLED black</div>
            <div className="text-[12px] text-muted-foreground">Pure black in dark mode to save battery on OLED screens</div>
          </div>
          <Switch checked={amoled} onCheckedChange={setAmoled} aria-label="AMOLED black theme" />
        </div>

        <SectionLabel>Routines</SectionLabel>
        <Card>
          <Row
            icon={Clock}
            label="Daily reset time"
            hint={`Routines reset at ${formatTime(resetHour, resetMinute)}`}
            right={<span className="text-[13px] text-muted-foreground">{formatTime(resetHour, resetMinute)}</span>}
            onClick={() => setResetOpen(true)}
          />
          <Row
            icon={CalendarDays}
            label="Start of week"
            right={
              <div className="flex rounded-full bg-muted p-0.5 text-[12px] font-bold">
                {[
                  { v: 1, l: "Mon" },
                  { v: 0, l: "Sun" },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateSettings({ startOfWeek: opt.v as 0 | 1 });
                      tapHaptic();
                    }}
                    className={cn(
                      "px-3 py-1 rounded-full transition-colors",
                      startOfWeek === opt.v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            }
          />
          <Row
            icon={Flame}
            label="Streak goal"
            hint={`Target ${streakGoal} day streak`}
            right={<span className="text-[13px] text-muted-foreground tabular-nums">{streakGoal}d</span>}
            onClick={() => setStreakOpen(true)}
            last
          />
        </Card>

        <SectionLabel>Library</SectionLabel>
        <Card>
          <Row
            icon={LayoutTemplate}
            label="Templates"
            hint="Browse and add ready-made routines"
            onClick={() => setTplOpen(true)}
            last
          />
        </Card>

        <SectionLabel>Notifications</SectionLabel>
        <Card>
          <Row
            icon={Bell}
            label="Daily reminder"
            hint="Push notification each morning"
            right={
              <Switch
                checked={dailyReminder}
                onCheckedChange={(v) => {
                  updateSettings({ dailyReminder: v } as any);
                  tapHaptic();
                }}
              />
            }
          />
          <Row
            icon={Clock}
            label="Reminder time"
            hint="When to remind you"
            right={<span className="text-[13px] text-muted-foreground tabular-nums">{formatTime(reminderHour, reminderMinute)}</span>}
            onClick={() => setReminderClockOpen(true)}
          />
          <Row
            icon={InfoIcon}
            label="Streak reminders"
            hint="Alert before streak breaks"
            right={
              <Switch
                checked={streakReminder}
                onCheckedChange={(v) => {
                  updateSettings({ streakReminder: v } as any);
                  tapHaptic();
                }}
              />
            }
          />
          <Row
            icon={TrendingUp}
            label="Completion celebration"
            hint="Animation on 100% done"
            right={
              <Switch
                checked={completionCelebration}
                onCheckedChange={(v) => {
                  updateSettings({ completionCelebration: v } as any);
                  tapHaptic();
                }}
              />
            }
            last
          />
        </Card>

        <SectionLabel>Insights</SectionLabel>
        <Card>
          <Row
            icon={BarChart3}
            label="Weekly report"
            hint="See completed tasks, mood, and skip patterns"
            onClick={() => navigate("/weekly-report")}
            last
          />
        </Card>

        <SectionLabel>Data</SectionLabel>
        <Card>
          <Row
            icon={Download}
            label="Export data (JSON)"
            hint="Download a full JSON backup"
            onClick={handleExport}
          />
          <Row
            icon={FileSpreadsheet}
            label="Export tasks (CSV)"
            hint="Per-day tasks for Excel or Sheets"
            onClick={handleExportCSV}
          />
          <Row
            icon={Upload}
            label="Import data"
            hint="Restore from a JSON or CSV file"
            onClick={() => fileInputRef.current?.click()}
            last
          />
        </Card>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json,text/csv,.csv"
          className="hidden"
          onChange={handleImportFile}
        />

        <SectionLabel>
          <span className="inline-flex items-center gap-1.5 text-destructive">
            <AlertTriangle size={11} /> Danger zone
          </span>
        </SectionLabel>
        <Card className="border-destructive/30">
          <Row
            icon={RefreshCcw}
            label="Reset all streaks"
            hint="Set every routine streak to 0"
            onClick={() => setResetStreaksOpen(true)}
            destructive
          />
          <Row
            icon={Trash2}
            label="Delete all data"
            hint="Wipe routines, history, moods, settings"
            onClick={() => setDeleteAllOpen(true)}
            destructive
            last
          />
        </Card>

        <h3 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-bold px-1 mt-7 mb-2.5">
          About
        </h3>
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[15px] font-semibold">Daily Routines</p>
              <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
                A simple, calm space to track the rhythms that matter to you — routines, moods, and progress in one place.
              </p>
            </div>
          </div>
          <a
            href="https://x.com/The1UX"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl bg-muted/60 hover:bg-muted px-3.5 py-3 transition-colors"
          >
            <Twitter size={18} className="text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] text-muted-foreground">Developer</p>
              <p className="text-[14px] font-semibold">@The1UX</p>
            </div>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">Follow</span>
          </a>
        </div>
      </main>

      {/* Reset hour picker */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="rounded-[28px] p-6 max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-bold text-left">Daily reset time</DialogTitle>
            <DialogDescription className="text-left text-[14px]">
              Choose when each new day begins.
            </DialogDescription>
          </DialogHeader>

          {/* Preset tiles */}
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            {RESET_PRESETS.map((p) => {
              const active = resetHour === p.hour && resetMinute === p.minute && !isCustomSelected;
              return (
                <button
                  key={p.label}
                  onClick={() => {
                    updateSettings({ resetHour: p.hour, resetMinute: p.minute } as any);
                    tapHaptic();
                    setResetOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all",
                    active
                      ? "border-foreground bg-foreground/5 shadow-sm"
                      : "border-border bg-card hover:bg-muted/50"
                  )}
                >
                  <div>
                    <p className="text-[13px] font-bold leading-tight">{p.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{p.sub}</p>
                  </div>
                  {active && <Check size={14} className="ml-auto shrink-0" />}
                </button>
              );
            })}

            {/* Custom tile — opens analog clock */}
            <button
              onClick={() => {
                setResetOpen(false);
                setTimeout(() => setClockOpen(true), 150);
              }}
              className={cn(
                "col-span-2 flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all",
                isCustomSelected
                  ? "border-foreground bg-foreground/5 shadow-sm"
                  : "border-border bg-card hover:bg-muted/50"
              )}
            >
              <div className="flex-1">
                <p className="text-[13px] font-bold leading-tight">Custom time</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isCustomSelected ? formatTime(resetHour, resetMinute) : "Set your own time"}
                </p>
              </div>
              {isCustomSelected && <Check size={14} className="shrink-0" />}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analog clock picker */}
      <ClockPickerDialog
        open={clockOpen}
        onOpenChange={setClockOpen}
        initialHour={resetHour}
        initialMinute={resetMinute}
        onConfirm={handleClockConfirm}
      />

      <ClockPickerDialog
        open={reminderClockOpen}
        onOpenChange={setReminderClockOpen}
        initialHour={reminderHour}
        initialMinute={reminderMinute}
        onConfirm={(h, m) => {
          updateSettings({ reminderHour: h, reminderMinute: m } as any);
          tapHaptic();
        }}
      />

      {/* Streak goal */}
      <Dialog open={streakOpen} onOpenChange={(o) => { setStreakOpen(o); if (!o) setCustomStreakEditing(false); }}>
        <DialogContent className="rounded-[28px] p-6 max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-bold text-left">Streak goal</DialogTitle>
            <DialogDescription className="text-left text-[14px]">
              Pick the streak you're aiming for.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[3, 7, 14, 21, 30, 60, 90, 365].map((d) => (
              <button
                key={d}
                onClick={() => {
                  updateSettings({ streakGoal: d });
                  tapHaptic();
                  setCustomStreakEditing(false);
                  setStreakOpen(false);
                }}
                className={cn(
                  "py-3 rounded-xl border text-[14px] font-bold transition-colors",
                  streakGoal === d && !customStreakEditing ? "border-foreground bg-foreground/5" : "border-border hover:bg-muted/60"
                )}
              >
                {d} days
              </button>
            ))}

            {/* Custom streak tile */}
            {customStreakEditing ? (
              <div className={cn(
                "relative py-2 px-2 rounded-xl border flex items-center",
                "border-foreground bg-foreground/5"
              )}>
                <input
                  autoFocus
                  value={customStreakRaw}
                  onChange={(e) => setCustomStreakRaw(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const n = parseInt(customStreakRaw, 10);
                      if (!isNaN(n) && n > 0) {
                        updateSettings({ streakGoal: n });
                        tapHaptic();
                        setCustomStreakEditing(false);
                        setStreakOpen(false);
                      }
                    }
                    if (e.key === "Escape") setCustomStreakEditing(false);
                  }}
                  onBlur={() => {
                    const n = parseInt(customStreakRaw, 10);
                    if (!isNaN(n) && n > 0) {
                      updateSettings({ streakGoal: n });
                      tapHaptic();
                    }
                    setCustomStreakEditing(false);
                  }}
                  placeholder="days"
                  inputMode="numeric"
                  className="w-full bg-transparent text-center text-[14px] font-bold outline-none placeholder:text-muted-foreground"
                />
              </div>
            ) : (
              <button
                onClick={() => {
                  setCustomStreakRaw("");
                  setCustomStreakEditing(true);
                }}
                className={cn(
                  "py-3 rounded-xl border text-[14px] font-bold transition-colors",
                  ![3, 7, 14, 21, 30, 60, 90, 365].includes(streakGoal)
                    ? "border-foreground bg-foreground/5"
                    : "border-border hover:bg-muted/60"
                )}
              >
                {![3, 7, 14, 21, 30, 60, 90, 365].includes(streakGoal) ? `${streakGoal}d` : "Custom"}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates */}
      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent className="rounded-[28px] p-6 max-w-[90vw] sm:max-w-md max-h-[80vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-bold text-left">Templates</DialogTitle>
            <DialogDescription className="text-left text-[14px]">
              Tap to add a ready-made routine to your day.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2 mx-auto w-full max-w-sm">
            {TEMPLATES.map((t) => (
              <button
                key={t.title}
                onClick={() => {
                  tapHaptic();
                  setPreviewTpl(t);
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
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.description}</p>
                </div>
                <div className="h-8 w-8 shrink-0 rounded-full bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all">
                  <Eye size={15} strokeWidth={2.5} />
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Preview */}
      <Dialog open={!!previewTpl} onOpenChange={(o) => !o && setPreviewTpl(null)}>
        <DialogContent className="rounded-[28px] p-0 gap-0 max-w-[92vw] sm:max-w-md overflow-hidden">
          {previewTpl && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 space-y-2 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center text-2xl">
                    {previewTpl.emoji}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <DialogTitle className="text-xl font-serif font-bold leading-tight">
                      {previewTpl.title}
                    </DialogTitle>
                    <DialogDescription className="text-[12px] text-muted-foreground mt-0.5">
                      {previewTpl.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="max-h-[55vh] overflow-y-auto px-6 py-4 space-y-1.5">
                {previewTpl.blocks.map((b, i) => (
                  <PreviewBlockRow key={i} block={b} />
                ))}
              </div>

              <DialogFooter className="flex flex-row gap-3 sm:justify-end px-6 py-4 border-t border-border bg-muted/20">
                <Button
                  variant="outline"
                  onClick={() => setPreviewTpl(null)}
                  className="flex-1 rounded-2xl h-11 font-semibold border-border/60"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const tpl = previewTpl;
                    setPreviewTpl(null);
                    handleAddTemplate(tpl);
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

      {/* Reset streaks confirm */}
      <Dialog open={resetStreaksOpen} onOpenChange={setResetStreaksOpen}>
        <DialogContent className="rounded-[28px] p-7 max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-bold text-left">Reset all streaks?</DialogTitle>
            <DialogDescription className="text-left text-[14px]">
              This will set every routine streak back to 0. Your tasks and history won't be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3">
            <Button variant="outline" onClick={() => setResetStreaksOpen(false)} className="flex-1 rounded-2xl h-12 font-bold">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetStreaks} className="flex-1 rounded-2xl h-12 font-bold">
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete all confirm */}
      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent className="rounded-[28px] p-7 max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-bold text-left">Delete all data?</DialogTitle>
            <DialogDescription className="text-left text-[14px]">
              This permanently removes every routine, mood entry, history record, and setting. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3">
            <Button variant="outline" onClick={() => setDeleteAllOpen(false)} className="flex-1 rounded-2xl h-12 font-bold">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAll} className="flex-1 rounded-2xl h-12 font-bold">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import confirm */}
      <Dialog open={!!importConfirm} onOpenChange={(o) => !o && setImportConfirm(null)}>
        <DialogContent className="rounded-[28px] p-7 max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-bold text-left">Restore from backup?</DialogTitle>
            <DialogDescription className="text-left text-[14px]">
              This replaces all current data with the backup file
              {importConfirm ? ` (${importConfirm.routines} routines, ${importConfirm.sections} sections)` : ""}. Current data will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3">
            <Button variant="outline" onClick={() => setImportConfirm(null)} className="flex-1 rounded-2xl h-12 font-bold">
              Cancel
            </Button>
            <Button onClick={confirmImport} className="flex-1 rounded-2xl h-12 font-bold bg-foreground text-background hover:bg-foreground/90">
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import error */}
      <Dialog open={!!importError} onOpenChange={(o) => !o && setImportError(null)}>
        <DialogContent className="rounded-[28px] p-7 max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-bold text-left">Couldn't import</DialogTitle>
            <DialogDescription className="text-left text-[14px]">{importError}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setImportError(null)} className="rounded-2xl h-12 font-bold w-full">OK</Button>
          </DialogFooter>
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

export default Settings;

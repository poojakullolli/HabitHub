import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ClockPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialHour?: number;
  initialMinute?: number;
  onConfirm: (hour: number, minute: number) => void;
}

const C = 130;
const FACE_R = 112;
const NUM_R = 90;
const HOUR_LEN = 60;
const MIN_LEN = 82;
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINS  = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const toXY = (deg: number, r: number) => ({
  x: C + Math.sin((deg * Math.PI) / 180) * r,
  y: C - Math.cos((deg * Math.PI) / 180) * r,
});

/** Returns angle 0–360 and whether the pointer is inside the clock face circle */
const getPointerInfo = (svg: SVGSVGElement, clientX: number, clientY: number) => {
  const rect = svg.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // FACE_R in SVG units, but rect is in CSS px. Scale factor:
  const scale = rect.width / (C * 2);
  const insideCircle = dist <= FACE_R * scale;
  let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  return { angle, insideCircle };
};

export const ClockPickerDialog = ({
  open,
  onOpenChange,
  initialHour = 0,
  initialMinute = 0,
  onConfirm,
}: ClockPickerDialogProps) => {
  const to12 = (h: number) => (h % 12 === 0 ? 12 : h % 12);

  const [mode, setMode]     = useState<"hour" | "minute">("hour");
  const [hour12, setHour12] = useState(to12(initialHour));
  const [minute, setMinute] = useState(initialMinute);
  const [ampm, setAmPm]     = useState<"AM" | "PM">(initialHour < 12 ? "AM" : "PM");

  const [editingH, setEditingH] = useState(false);
  const [editingM, setEditingM] = useState(false);
  const [rawH, setRawH] = useState("");
  const [rawM, setRawM] = useState("");

  const svgRef   = useRef<SVGSVGElement>(null);
  const hourRef  = useRef<HTMLInputElement>(null);
  const minRef   = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setMode("hour");
      setHour12(to12(initialHour));
      setMinute(initialMinute);
      setAmPm(initialHour < 12 ? "AM" : "PM");
      setEditingH(false);
      setEditingM(false);
    }
  }, [open, initialHour, initialMinute]);

  // Focus + pre-fill input when entering edit mode
  useEffect(() => {
    if (editingH) {
      const val = hour12.toString().padStart(2, "0");
      setRawH(val);
      setTimeout(() => { hourRef.current?.focus(); hourRef.current?.select(); }, 0);
    }
  }, [editingH]);

  useEffect(() => {
    if (editingM) {
      const val = minute.toString().padStart(2, "0");
      setRawM(val);
      setTimeout(() => { minRef.current?.focus(); minRef.current?.select(); }, 0);
    }
  }, [editingM]);

  // Clock interaction — only applies when inside circle
  const applyAngle = useCallback(
    (angle: number, isRelease = false) => {
      if (mode === "hour") {
        let h = Math.round(angle / 30) % 12;
        if (h === 0) h = 12;
        setHour12(h);
        if (isRelease) setTimeout(() => setMode("minute"), 180);
      } else {
        setMinute(Math.round(angle / 6) % 60);
      }
    },
    [mode]
  );

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const { angle, insideCircle } = getPointerInfo(e.currentTarget as SVGSVGElement, e.clientX, e.clientY);
    if (!insideCircle) return;
    dragging.current = true;
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    applyAngle(angle);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const { angle } = getPointerInfo(svgRef.current!, e.clientX, e.clientY);
    applyAngle(angle);
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    const { angle } = getPointerInfo(svgRef.current!, e.clientX, e.clientY);
    applyAngle(angle, true);
  };

  // Manual hour
  const commitHour = (raw: string) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 1 && n <= 12) setHour12(n);
    setEditingH(false);
  };
  const onHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setRawH(val);
    if (val.length === 2) {
      const n = parseInt(val, 10);
      if (n >= 1 && n <= 12) {
        setHour12(n);
        setEditingH(false);
        setEditingM(true);
      }
    }
  };
  const onHourKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { commitHour(rawH); setEditingM(true); }
    if (e.key === "Escape") setEditingH(false);
  };

  // Manual minute
  const commitMinute = (raw: string) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 0 && n <= 59) setMinute(n);
    setEditingM(false);
  };
  const onMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setRawM(val);
    if (val.length === 2) {
      const n = parseInt(val, 10);
      if (n >= 0 && n <= 59) { setMinute(n); setEditingM(false); }
    }
  };
  const onMinKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitMinute(rawM);
    if (e.key === "Escape") setEditingM(false);
  };

  // Derived
  const hourAngle   = (hour12 % 12) * 30 + minute * 0.5;
  const minuteAngle = minute * 6;
  const hourTip     = toXY(hourAngle, HOUR_LEN);
  const minuteTip   = toXY(minuteAngle, MIN_LEN);
  const dispH       = hour12.toString().padStart(2, "0");
  const dispM       = minute.toString().padStart(2, "0");
  const selMinLabel = Math.round(minute / 5) * 5 % 60;

  const handleConfirm = () => {
    let h = hour12 % 12;
    if (ampm === "PM") h += 12;
    onConfirm(h, minute);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[28px] p-6 max-w-[90vw] sm:max-w-sm">

        {/* ── Time display ── */}
        <div className="flex items-center mb-4">

          {/* Hour box */}
          <div
            onClick={() => { setMode("hour"); setEditingH(true); setEditingM(false); }}
            className={cn(
              "relative flex items-center justify-center w-[76px] h-[68px] rounded-2xl cursor-text transition-colors overflow-hidden",
              mode === "hour" ? "bg-foreground" : "bg-muted"
            )}
          >
            {editingH ? (
              <input
                ref={hourRef}
                value={rawH}
                onChange={onHourChange}
                onKeyDown={onHourKey}
                onBlur={() => commitHour(rawH)}
                className={cn(
                  "w-full h-full text-center text-[40px] font-bold bg-transparent outline-none",
                  mode === "hour" ? "text-background caret-background" : "text-foreground caret-foreground"
                )}
                maxLength={2}
                inputMode="numeric"
              />
            ) : (
              <span className={cn(
                "text-[40px] font-bold tabular-nums leading-none",
                mode === "hour" ? "text-background" : "text-foreground"
              )}>{dispH}</span>
            )}
          </div>

          <span className="text-[40px] font-bold text-muted-foreground mx-1.5 leading-none select-none">:</span>

          {/* Minute box */}
          <div
            onClick={() => { setMode("minute"); setEditingM(true); setEditingH(false); }}
            className={cn(
              "relative flex items-center justify-center w-[76px] h-[68px] rounded-2xl cursor-text transition-colors overflow-hidden",
              mode === "minute" ? "bg-foreground" : "bg-muted"
            )}
          >
            {editingM ? (
              <input
                ref={minRef}
                value={rawM}
                onChange={onMinChange}
                onKeyDown={onMinKey}
                onBlur={() => commitMinute(rawM)}
                className={cn(
                  "w-full h-full text-center text-[40px] font-bold bg-transparent outline-none",
                  mode === "minute" ? "text-background caret-background" : "text-foreground caret-foreground"
                )}
                maxLength={2}
                inputMode="numeric"
              />
            ) : (
              <span className={cn(
                "text-[40px] font-bold tabular-nums leading-none",
                mode === "minute" ? "text-background" : "text-foreground"
              )}>{dispM}</span>
            )}
          </div>

          {/* AM / PM */}
          <div className="flex flex-col gap-1.5 ml-auto mr-6">
            {(["AM", "PM"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setAmPm(p)}
                className={cn(
                  "text-[13px] font-bold px-3 py-1.5 rounded-lg border transition-colors",
                  ampm === p
                    ? "border-foreground bg-foreground/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* ── Mode tabs ── */}
        <div className="flex gap-2 mb-3">
          {(["hour", "minute"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 py-1.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-colors",
                mode === m ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {m}
            </button>
          ))}
        </div>

        {/* ── Clock face ── */}
        <div className="flex justify-center">
          <svg
            ref={svgRef}
            viewBox="0 0 260 260"
            width={260}
            height={260}
            className="touch-none select-none cursor-pointer"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {/* Face */}
            <circle cx={C} cy={C} r={FACE_R} className="fill-muted" />

            {/* Tick marks */}
            {Array.from({ length: 60 }).map((_, i) => {
              const a = (i / 60) * 360;
              const outer = toXY(a, FACE_R - 4);
              const inner = toXY(a, i % 5 === 0 ? FACE_R - 13 : FACE_R - 8);
              return (
                <line
                  key={i}
                  x1={outer.x} y1={outer.y}
                  x2={inner.x} y2={inner.y}
                  stroke="currentColor"
                  strokeOpacity={i % 5 === 0 ? 0.3 : 0.12}
                  strokeWidth={i % 5 === 0 ? 2 : 1}
                  className="text-foreground"
                />
              );
            })}

            {/* Hour hand */}
            <line
              x1={C} y1={C} x2={hourTip.x} y2={hourTip.y}
              stroke="currentColor" strokeWidth={4} strokeLinecap="round"
              className="text-foreground"
              opacity={mode === "hour" ? 1 : 0.3}
              style={{ transition: "opacity 0.2s" }}
            />

            {/* Minute hand */}
            <line
              x1={C} y1={C} x2={minuteTip.x} y2={minuteTip.y}
              stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
              className="text-foreground"
              opacity={mode === "minute" ? 1 : 0.3}
              style={{ transition: "opacity 0.2s" }}
            />

            {/* Active tip dot */}
            <circle
              cx={mode === "hour" ? hourTip.x : minuteTip.x}
              cy={mode === "hour" ? hourTip.y : minuteTip.y}
              r={11} className="fill-foreground"
            />

            {/* Center cap */}
            <circle cx={C} cy={C} r={5} className="fill-foreground" />

            {/* ── Hour numbers (always visible) ── */}
            {HOURS.map((n, i) => {
              const pos = toXY((i / 12) * 360, NUM_R);
              const sel = mode === "hour" && n === hour12;
              return (
                <g key={n}>
                  {sel && <circle cx={pos.x} cy={pos.y} r={18} className="fill-foreground" />}
                  <text
                    x={pos.x} y={pos.y}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={15} fontWeight="700"
                    fill={sel ? "hsl(var(--background))" : mode === "minute" ? "hsl(var(--foreground) / 0.35)" : "hsl(var(--foreground))"}
                  >
                    {n}
                  </text>
                </g>
              );
            })}

            {/* ── Minute labels — only in minute mode, at same positions, replace hour numbers ── */}
            {mode === "minute" && MINS.map((m, i) => {
              const pos = toXY((i / 12) * 360, NUM_R);
              const sel = m === selMinLabel;
              return (
                <g key={`m-${m}`}>
                  {sel && <circle cx={pos.x} cy={pos.y} r={18} className="fill-foreground" />}
                  <text
                    x={pos.x} y={pos.y}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={14} fontWeight="700"
                    fill={sel ? "hsl(var(--background))" : "hsl(var(--foreground))"}
                  >
                    {m.toString().padStart(2, "0")}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hint */}
        <p className="text-center text-[12px] text-muted-foreground mt-1.5">
          {mode === "hour" ? "Drag inside clock to set hour" : "Drag inside clock to set minute"}
        </p>

        {/* Confirm */}
        <button
          onClick={handleConfirm}
          className="w-full mt-3 py-3.5 rounded-2xl bg-foreground text-background text-[15px] font-bold hover:opacity-80 transition-opacity"
        >
          Confirm
        </button>
      </DialogContent>
    </Dialog>
  );
};

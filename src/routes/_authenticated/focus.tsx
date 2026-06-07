import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopAppBar } from "@/components/TopAppBar";
import { logFocusSession, getStudyStats } from "@/lib/focus.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/focus")({
  head: () => ({ meta: [{ title: "Focus — Lumen" }] }),
  component: FocusPage,
});

const PRESETS = [15, 25, 45, 60];

function FocusPage() {
  const logFn = useServerFn(logFocusSession);
  const statsFn = useServerFn(getStudyStats);
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => statsFn() });

  const [target, setTarget] = useState(25); // minutes
  const [remaining, setRemaining] = useState(25 * 60); // seconds
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishedRef = useRef(false);

  const save = useMutation({
    mutationFn: (min: number) => logFn({ data: { duration_min: min } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Session logged ✨");
    },
  });

  useEffect(() => {
    if (!running) {
      if (ref.current) clearInterval(ref.current);
      return;
    }
    ref.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (ref.current) clearInterval(ref.current);
          setRunning(false);
          if (!finishedRef.current) {
            finishedRef.current = true;
            save.mutate(target);
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running, target, save]);

  function start() {
    finishedRef.current = false;
    if (remaining === 0) setRemaining(target * 60);
    setRunning(true);
  }
  function pause() { setRunning(false); }
  function reset() {
    setRunning(false);
    setRemaining(target * 60);
    finishedRef.current = false;
  }
  function stopAndLog() {
    setRunning(false);
    const elapsed = target * 60 - remaining;
    const min = Math.round(elapsed / 60);
    if (min >= 1 && !finishedRef.current) {
      finishedRef.current = true;
      save.mutate(min);
    }
    setRemaining(target * 60);
  }
  function pick(min: number) {
    setTarget(min);
    setRemaining(min * 60);
    setRunning(false);
    finishedRef.current = false;
  }

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const pct = ((target * 60 - remaining) / (target * 60)) * 100;

  return (
    <div className="pb-32">
      <TopAppBar title="Focus" />
      <main className="px-4 sm:px-6 pt-4 max-w-2xl mx-auto space-y-6">
        <section className="glass-card rounded-3xl p-8 flex flex-col items-center">
          <div className="relative w-64 h-64 mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="3" />
              <circle
                cx="50" cy="50" r="46" fill="none"
                stroke="oklch(0.78 0.15 280)"
                strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 289.03} 289.03`}
                style={{ transition: "stroke-dasharray 0.4s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-6xl font-bold tabular-nums">{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>
              <span className="text-xs text-outline-variant uppercase tracking-wider mt-1">{target} min session</span>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => pick(p)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  target === p ? "bg-primary text-primary-foreground" : "bg-white/5 text-on-surface-variant hover:bg-white/10"
                }`}
              >{p}m</button>
            ))}
          </div>

          <div className="flex gap-3">
            {!running ? (
              <button onClick={start} className="rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground flex items-center gap-2 hover:bg-primary/90">
                <span className="material-symbols-outlined">play_arrow</span>Start
              </button>
            ) : (
              <button onClick={pause} className="rounded-full bg-secondary-fixed px-8 py-3 font-semibold text-background flex items-center gap-2">
                <span className="material-symbols-outlined">pause</span>Pause
              </button>
            )}
            <button onClick={stopAndLog} className="rounded-full glass-card px-6 py-3 font-semibold flex items-center gap-2 hover:bg-white/10">
              <span className="material-symbols-outlined">stop</span>Stop & log
            </button>
            <button onClick={reset} className="rounded-full glass-card p-3 hover:bg-white/10" aria-label="Reset">
              <span className="material-symbols-outlined">refresh</span>
            </button>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3">
          <Stat label="Today" value={`${((stats.data?.todayMin ?? 0) / 60).toFixed(1)}h`} />
          <Stat label="Streak" value={`${stats.data?.streak ?? 0}d`} />
          <Stat label="Total (120d)" value={`${Math.round((stats.data?.totalMin ?? 0) / 60)}h`} />
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-2xl p-4 text-center">
      <p className="text-[10px] uppercase tracking-wider text-outline-variant">{label}</p>
      <p className="font-display text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

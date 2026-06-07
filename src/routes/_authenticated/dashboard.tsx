import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/TopAppBar";
import { Heatmap } from "@/components/Heatmap";
import { getStudyStats } from "@/lib/focus.functions";
import { listNotes } from "@/lib/notes.functions";
import { listTasks, toggleTask } from "@/lib/tasks.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Lumen" }] }),
  component: Dashboard,
});

function Dashboard() {
  const statsFn = useServerFn(getStudyStats);
  const tasksFn = useServerFn(listTasks);
  const toggleFn = useServerFn(toggleTask);
  const qc = useQueryClient();

  const stats = useQuery({ queryKey: ["stats"], queryFn: () => statsFn() });
  const notesFn = useServerFn(listNotes);
  const notes = useQuery({ queryKey: ["notes"], queryFn: () => notesFn() });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => tasksFn() });

  const toggle = useMutation({
    mutationFn: (vars: { id: string; completed: boolean }) => toggleFn({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const todayMin = stats.data?.todayMin ?? 0;
  const yMin = stats.data?.yesterdayMin ?? 0;
  const hours = (todayMin / 60).toFixed(1);
  const trend = yMin > 0 ? Math.round(((todayMin - yMin) / yMin) * 100) : todayMin > 0 ? 100 : 0;
  const streak = stats.data?.streak ?? 0;
  const nextMilestone = Math.max(1, Math.ceil((streak + 1) / 7) * 7);
  const progress = Math.min(100, (streak / nextMilestone) * 100);

  const incomplete = (tasks.data ?? []).filter((t) => !t.completed).slice(0, 3);
  const completed = (tasks.data ?? []).filter((t) => t.completed).slice(0, 1);
  const todayList = [...incomplete, ...completed];
  const todayCount = (tasks.data ?? []).filter((t) => !t.completed).length;
  const noteCount = notes.data?.length ?? 0;
  const pdfCount = notes.data?.filter((note) => note.source === "pdf").length ?? 0;

  return (
    <div className="pb-32">
      <TopAppBar title="Lumen" />
      <main className="px-4 sm:px-6 pt-4 max-w-4xl mx-auto space-y-6">
        {/* Hero */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Streak */}
          <div className="glass-card p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <span className="material-symbols-outlined text-9xl text-secondary-fixed">local_fire_department</span>
            </div>
            <div>
              <p className="text-[11px] text-outline-variant uppercase tracking-wider font-semibold">Current Streak</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-display text-5xl font-bold text-secondary-fixed">{streak}</span>
                <span className="text-on-surface-variant">Days</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-secondary-container rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[11px] text-secondary-fixed">Next: {nextMilestone}</span>
            </div>
          </div>

          {/* Focus */}
          <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <p className="text-[11px] text-outline-variant uppercase tracking-wider font-semibold">Today's Focus</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-display text-5xl font-bold text-primary-fixed-dim">{hours}</span>
                <span className="text-on-surface-variant">Hours</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5">
              <span className={`material-symbols-outlined text-lg ${trend >= 0 ? "text-primary-fixed-dim" : "text-error"}`}>
                {trend >= 0 ? "trending_up" : "trending_down"}
              </span>
              <span className={`text-xs ${trend >= 0 ? "text-primary-fixed-dim" : "text-error"}`}>
                {trend >= 0 ? "+" : ""}{trend}% vs yesterday
              </span>
            </div>
          </div>
        </section>

        {/* Heatmap + Quick actions */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 glass-card p-5 rounded-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-tight text-on-surface-variant">Study Heatmap</h3>
              <span className="text-[11px] text-outline-variant">Last 12 weeks</span>
            </div>
            {stats.data ? <Heatmap days={stats.data.heatmap} /> : <div className="h-32 animate-pulse bg-white/5 rounded" />}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex-1 glass-card p-4 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary-fixed-dim">
                <span className="material-symbols-outlined">description</span>
              </div>
              <div className="text-left">
                <p className="font-semibold">Notes stored</p>
                <p className="text-[11px] text-outline-variant">Total notes: {noteCount}</p>
              </div>
            </div>
            <div className="flex-1 glass-card p-4 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-tertiary/20 flex items-center justify-center text-tertiary-fixed-dim">
                <span className="material-symbols-outlined">folder_open</span>
              </div>
              <div className="text-left">
                <p className="font-semibold">PDFs stored</p>
                <p className="text-[11px] text-outline-variant">Total PDFs: {pdfCount}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Tasks */}
        <section className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-display text-2xl font-bold">Tasks</h2>
              <p className="text-xs text-outline-variant">You have {todayCount} open task{todayCount === 1 ? "" : "s"}</p>
            </div>
            <Link to="/tasks" className="text-primary-fixed-dim text-xs font-bold flex items-center gap-1">
              View all <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          <div className="space-y-2">
            {tasks.isLoading && <div className="h-16 glass-card rounded-2xl animate-pulse" />}
            {tasks.data && todayList.length === 0 && (
              <div className="glass-card rounded-2xl p-6 text-center text-on-surface-variant text-sm">
                No tasks yet. <Link to="/tasks" className="text-primary-fixed-dim font-semibold">Add one →</Link>
              </div>
            )}
            {todayList.map((t) => (
              <div key={t.id} className={`glass-card p-4 rounded-2xl flex items-center gap-4 group ${t.completed ? "opacity-70" : "hover:border-primary/40"}`}>
                <button
                  onClick={() => toggle.mutate({ id: t.id, completed: !t.completed })}
                  className={`w-6 h-6 rounded-md flex items-center justify-center border-2 ${
                    t.completed ? "bg-primary-container border-primary-container" : "border-outline-variant hover:border-primary-fixed-dim"
                  }`}
                  aria-label={t.completed ? "Mark incomplete" : "Mark complete"}
                >
                  {t.completed && <span className="material-symbols-outlined text-white text-lg">check</span>}
                </button>
                <div className="flex-1">
                  <p className={`text-sm ${t.completed ? "line-through text-on-surface-variant" : ""}`}>{t.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {t.due_at && !t.completed && (
                      <span className="text-[11px] text-outline-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {new Date(t.due_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </span>
                    )}
                    <PriorityPill priority={t.priority} completed={t.completed} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function PriorityPill({ priority, completed }: { priority: string; completed: boolean }) {
  if (completed) {
    return (
      <span className="text-[11px] text-outline-variant flex items-center gap-1">
        <span className="material-symbols-outlined text-sm">done_all</span>Completed
      </span>
    );
  }
  const styles: Record<string, string> = {
    high: "bg-error/20 text-error",
    medium: "bg-primary/20 text-primary-fixed-dim",
    low: "bg-white/10 text-on-surface-variant",
    project: "bg-tertiary/20 text-tertiary-fixed-dim",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${styles[priority] ?? styles.low}`}>
      {priority}
    </span>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/TopAppBar";
import { listTasks, addTask, toggleTask, deleteTask } from "@/lib/tasks.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — Lumen" }] }),
  component: TasksPage,
});

const PRIORITIES = ["low", "medium", "high", "project"] as const;

function TasksPage() {
  const listFn = useServerFn(listTasks);
  const addFn = useServerFn(addTask);
  const toggleFn = useServerFn(toggleTask);
  const delFn = useServerFn(deleteTask);
  const qc = useQueryClient();

  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => listFn() });

  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<typeof PRIORITIES[number]>("medium");

  const add = useMutation({
    mutationFn: () =>
      addFn({
        data: {
          title,
          priority,
          due_at: due ? new Date(due).toISOString() : null,
        },
      }),
    onSuccess: () => {
      setTitle(""); setDue("");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; completed: boolean }) => toggleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const open = (tasks.data ?? []).filter((t) => !t.completed);
  const done = (tasks.data ?? []).filter((t) => t.completed);

  return (
    <div className="pb-32">
      <TopAppBar title="Tasks" />
      <main className="px-4 sm:px-6 pt-4 max-w-3xl mx-auto space-y-6">
        <section className="glass-card rounded-2xl p-5">
          <h2 className="font-display text-lg font-semibold mb-3">New task</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              add.mutate();
            }}
            className="space-y-3"
          >
            <input
              required value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-primary"
            />
            <div className="flex gap-2 flex-wrap">
              <input
                type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)}
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-on-surface flex-1 min-w-[180px]"
              />
              <select
                value={priority} onChange={(e) => setPriority(e.target.value as typeof PRIORITIES[number])}
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm"
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button
                type="submit" disabled={add.isPending}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >Add</button>
            </div>
          </form>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">Open · {open.length}</h3>
          {open.length === 0 && <div className="glass-card rounded-2xl p-6 text-center text-sm text-on-surface-variant">All clear ✨</div>}
          {open.map((t) => (
            <TaskRow key={t.id} task={t}
              onToggle={() => toggle.mutate({ id: t.id, completed: true })}
              onDelete={() => del.mutate(t.id)}
            />
          ))}
        </section>

        {done.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">Done · {done.length}</h3>
            {done.map((t) => (
              <TaskRow key={t.id} task={t}
                onToggle={() => toggle.mutate({ id: t.id, completed: false })}
                onDelete={() => del.mutate(t.id)}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete }: { task: { id: string; title: string; due_at: string | null; priority: string; completed: boolean }; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className={`glass-card p-4 rounded-2xl flex items-center gap-4 ${task.completed ? "opacity-70" : ""}`}>
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-md flex items-center justify-center border-2 ${
          task.completed ? "bg-primary-container border-primary-container" : "border-outline-variant hover:border-primary-fixed-dim"
        }`}
      >
        {task.completed && <span className="material-symbols-outlined text-white text-lg">check</span>}
      </button>
      <div className="flex-1">
        <p className={`text-sm ${task.completed ? "line-through text-on-surface-variant" : ""}`}>{task.title}</p>
        <div className="flex items-center gap-3 mt-1">
          {task.due_at && (
            <span className="text-[11px] text-outline-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">schedule</span>
              {new Date(task.due_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
            </span>
          )}
          <span className="text-[10px] uppercase font-bold tracking-tighter text-outline-variant">{task.priority}</span>
        </div>
      </div>
      <button onClick={onDelete} className="text-outline-variant hover:text-error p-1" aria-label="Delete">
        <span className="material-symbols-outlined text-lg">delete</span>
      </button>
    </div>
  );
}

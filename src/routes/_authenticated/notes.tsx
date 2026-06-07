import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/TopAppBar";
import { listNotes } from "@/lib/notes.functions";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({ meta: [{ title: "Notes — Lumen" }] }),
  component: NotesPage,
});

function NotesPage() {
  const fn = useServerFn(listNotes);
  const notes = useQuery({ queryKey: ["notes"], queryFn: () => fn() });

  return (
    <div className="pb-32">
      <TopAppBar title="Notes" />
      <main className="px-4 sm:px-6 pt-4 max-w-3xl mx-auto space-y-6">
        <section className="grid grid-cols-2 gap-3">
          <Link to="/notes/text" className="glass-card rounded-2xl p-5 flex items-center gap-3 hover:bg-white/10 group">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary-fixed-dim group-hover:bg-primary-container">
              <span className="material-symbols-outlined">description</span>
            </div>
            <div>
              <p className="font-semibold">PDF → Notes</p>
              <p className="text-[11px] text-outline-variant">Summarize a document</p>
            </div>
          </Link>
          <Link to="/notes/speech" className="glass-card rounded-2xl p-5 flex items-center gap-3 hover:bg-white/10 group">
            <div className="w-12 h-12 rounded-xl bg-tertiary/20 flex items-center justify-center text-tertiary-fixed-dim group-hover:bg-tertiary-container">
              <span className="material-symbols-outlined">mic</span>
            </div>
            <div>
              <p className="font-semibold">Speech → Notes</p>
              <p className="text-[11px] text-outline-variant">Record a lecture</p>
            </div>
          </Link>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-xl font-bold">Library</h2>
          {notes.isLoading && <div className="h-20 glass-card rounded-2xl animate-pulse" />}
          {notes.data && notes.data.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center text-on-surface-variant text-sm">
              No notes yet. Create your first one above.
            </div>
          )}
          {notes.data?.map((n) => (
            <Link
              key={n.id} to="/notes/$id" params={{ id: n.id }}
              className="block glass-card rounded-2xl p-4 hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant">
                  {n.source === "pdf" ? "description" : n.source === "speech" ? "mic" : "edit_note"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{n.title}</p>
                  {n.summary && <p className="text-xs text-on-surface-variant line-clamp-1">{n.summary}</p>}
                </div>
                <span className="text-[11px] text-outline-variant whitespace-nowrap">
                  {new Date(n.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}

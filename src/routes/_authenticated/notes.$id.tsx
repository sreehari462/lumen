import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { TopAppBar } from "@/components/TopAppBar";
import { getNote, deleteNote } from "@/lib/notes.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notes/$id")({
  head: () => ({ meta: [{ title: "Note — Lumen" }] }),
  component: NoteDetail,
});

function NoteDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getFn = useServerFn(getNote);
  const delFn = useServerFn(deleteNote);

  const note = useQuery({ queryKey: ["note", id], queryFn: () => getFn({ data: { id } }) });

  const del = useMutation({
    mutationFn: () => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      navigate({ to: "/notes" });
    },
  });

  if (note.isLoading) return (
    <div className="pb-32">
      <TopAppBar title="Note" back="/notes" />
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <div className="h-10 glass-card rounded-xl animate-pulse" />
        <div className="h-40 glass-card rounded-xl animate-pulse" />
      </div>
    </div>
  );
  if (!note.data) return null;
  const n = note.data;
  const keyPoints = (n.key_points as string[]) ?? [];
  const qa = (n.qa as Array<{ q: string; a: string }>) ?? [];

  return (
    <div className="pb-32">
      <TopAppBar title={n.source === "pdf" ? "PDF Note" : n.source === "speech" ? "Lecture Note" : "Note"} back="/notes" />
      <main className="px-4 sm:px-6 pt-4 max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-bold">{n.title}</h1>
          <p className="text-xs text-outline-variant">{new Date(n.created_at).toLocaleString()}</p>
          {n.summary && <p className="text-sm text-on-surface-variant">{n.summary}</p>}
        </header>

        {keyPoints.length > 0 && (
          <section className="glass-card rounded-2xl p-5">
            <h2 className="text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-3">Key points</h2>
            <ul className="space-y-2">
              {keyPoints.map((kp, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="text-primary-fixed-dim mt-0.5">▸</span>
                  <span>{kp}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {n.content_md && (
          <section className="glass-card rounded-2xl p-5">
            <h2 className="text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-3">Notes</h2>
            <div className="prose prose-invert prose-sm max-w-none prose-headings:font-display prose-headings:text-on-surface prose-p:text-on-surface-variant prose-strong:text-on-surface prose-li:text-on-surface-variant">
              <ReactMarkdown>{n.content_md}</ReactMarkdown>
            </div>
          </section>
        )}

        {qa.length > 0 && (
          <section className="glass-card rounded-2xl p-5">
            <h2 className="text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-3">Self-test</h2>
            <div className="space-y-3">
              {qa.map((item, i) => (
                <details key={i} className="rounded-xl border border-white/5 p-3 bg-white/5">
                  <summary className="cursor-pointer font-semibold text-sm">{item.q}</summary>
                  <p className="mt-2 text-sm text-on-surface-variant">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <button
          onClick={() => { if (confirm("Delete this note?")) del.mutate(); }}
          className="text-error text-sm flex items-center gap-1 hover:underline"
        >
          <span className="material-symbols-outlined text-base">delete</span>Delete note
        </button>
      </main>
    </div>
  );
}

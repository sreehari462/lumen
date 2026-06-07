import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TopAppBar } from "@/components/TopAppBar";
import { generateNotesFromText } from "@/lib/ai.functions";
import { saveNote } from "@/lib/notes.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notes/text")({
  head: () => ({ meta: [{ title: "Text to Notes — Lumen" }] }),
  component: TextToNotesPage,
});

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Use bundled worker
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  const max = Math.min(doc.numPages, 50);
  for (let i = 1; i <= max; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    out += tc.items.map((it) => ("str" in it ? (it as { str: string }).str : "")).join(" ") + "\n\n";
  }
  return out.trim();
}

function TextToNotesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const generate = useServerFn(generateNotesFromText);
  const save = useServerFn(saveNote);

  const [stage, setStage] = useState<"idle" | "extracting" | "generating">("idle");
  const [text, setText] = useState("");
  const [hint, setHint] = useState("");
  const [filename, setFilename] = useState<string | null>(null);

  const run = useMutation({
    mutationFn: async () => {
      const note = await generate({ data: { text: text.slice(0, 80000), source: "pdf", hint: hint || undefined } });
      const saved = await save({ data: { ...note, source: "pdf" } });
      return saved;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Notes generated");
      navigate({ to: "/notes/$id", params: { id: n.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed"),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    if (f.type === "application/pdf") {
      setStage("extracting");
      try {
        const t = await extractPdfText(f);
        if (t.length < 20) throw new Error("Couldn't read text from this PDF.");
        setText(t);
        toast.success(`Extracted ${Math.round(t.length / 1000)}k characters`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "PDF parse failed");
      } finally {
        setStage("idle");
      }
    } else {
      const t = await f.text();
      setText(t);
    }
  }

  return (
    <div className="pb-32">
      <TopAppBar title="Text to Notes" back="/notes" />
      <main className="px-4 sm:px-6 pt-4 max-w-3xl mx-auto space-y-5">
        <p className="text-sm text-on-surface-variant">
          Drop in a PDF or paste raw text. Lumen will produce a structured study note with a summary, key points, and self-test Q&amp;A.
        </p>

        <label className="block glass-card rounded-2xl p-8 text-center cursor-pointer hover:bg-white/10">
          <input type="file" accept="application/pdf,text/plain,.md" className="hidden" onChange={onFile} />
          <span className="material-symbols-outlined text-4xl text-primary-fixed-dim">upload_file</span>
          <p className="mt-2 font-semibold">{filename ?? "Click to choose a PDF or .txt"}</p>
          <p className="text-xs text-outline-variant mt-1">{stage === "extracting" ? "Extracting…" : "Up to 50 pages"}</p>
        </label>

        <div>
          <label className="text-xs uppercase tracking-wider text-outline-variant font-bold">Extracted text {text && `(${text.length.toLocaleString()} chars)`}</label>
          <textarea
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder="…or paste raw text here"
            rows={10}
            className="mt-1 w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-sm focus:outline-none focus:border-primary font-mono"
          />
        </div>

        <input
          value={hint} onChange={(e) => setHint(e.target.value)}
          placeholder="Optional: topic / subject hint (e.g. 'Organic Chemistry')"
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-primary"
        />

        <button
          onClick={() => run.mutate()}
          disabled={text.length < 20 || run.isPending || stage !== "idle"}
          className="w-full rounded-xl bg-gradient-to-r from-primary to-secondary-fixed px-6 py-4 font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">auto_awesome</span>
          {run.isPending ? "Generating notes…" : "Generate notes"}
        </button>
      </main>
    </div>
  );
}

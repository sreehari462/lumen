import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TopAppBar } from "@/components/TopAppBar";
import { generateNotesFromText } from "@/lib/ai.functions";
import { saveNote } from "@/lib/notes.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notes/speech")({
  head: () => ({ meta: [{ title: "Speech to Notes — Lumen" }] }),
  component: SpeechToNotesPage,
});

// Browser speech recognition typings
type SRConstructor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean; length: number }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSR(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function SpeechToNotesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const generate = useServerFn(generateNotesFromText);
  const save = useServerFn(saveNote);

  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [hint, setHint] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const SR = getSR();
    if (!SR) { setSupported(false); return; }
  }, []);

  function start() {
    const SR = getSR();
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let final = "";
      let temp = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript + " ";
        else temp += r[0].transcript;
      }
      if (final) setTranscript((t) => (t + " " + final).trim());
      setInterim(temp);
    };
    rec.onerror = (e) => {
      toast.error(`Mic error: ${e.error}`);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    rec.start();
    recRef.current = rec;
    setListening(true);
  }
  function stop() {
    recRef.current?.stop();
    setListening(false);
  }

  const run = useMutation({
    mutationFn: async () => {
      const note = await generate({ data: { text: transcript.slice(0, 80000), source: "speech", hint: hint || undefined } });
      return await save({ data: { ...note, source: "speech" } });
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Notes generated");
      navigate({ to: "/notes/$id", params: { id: n.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed"),
  });

  return (
    <div className="pb-32">
      <TopAppBar title="Speech to Notes" back="/notes" />
      <main className="px-4 sm:px-6 pt-4 max-w-3xl mx-auto space-y-5">
        {!supported && (
          <div className="glass-card rounded-2xl p-4 text-sm text-error">
            Speech recognition isn't supported in this browser. Try Chrome on desktop or Android.
          </div>
        )}

        <div className="glass-card rounded-3xl p-8 flex flex-col items-center">
          <button
            onClick={listening ? stop : start}
            disabled={!supported}
            className={`relative w-28 h-28 rounded-full flex items-center justify-center transition ${
              listening ? "bg-error" : "bg-gradient-to-br from-tertiary to-primary"
            } disabled:opacity-50`}
          >
            {listening && <span className="absolute inset-0 rounded-full bg-error/40 animate-ping" />}
            <span className="material-symbols-outlined text-white text-5xl relative z-10">
              {listening ? "stop" : "mic"}
            </span>
          </button>
          <p className="mt-4 text-sm text-on-surface-variant">
            {listening ? "Listening… speak naturally" : "Tap to start recording"}
          </p>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-outline-variant font-bold">Transcript</label>
          <div className="mt-1 glass-card rounded-2xl p-4 min-h-32 text-sm whitespace-pre-wrap">
            {transcript || <span className="text-outline-variant">Your words will appear here…</span>}
            {interim && <span className="text-on-surface-variant"> {interim}</span>}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[11px] text-outline-variant">{transcript.length} characters</span>
            {transcript && (
              <button onClick={() => setTranscript("")} className="text-[11px] text-outline-variant hover:text-error">Clear</button>
            )}
          </div>
        </div>

        <input
          value={hint} onChange={(e) => setHint(e.target.value)}
          placeholder="Optional: topic hint (e.g. 'Lecture 4 — Photosynthesis')"
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-primary"
        />

        <button
          onClick={() => run.mutate()}
          disabled={transcript.length < 20 || run.isPending || listening}
          className="w-full rounded-xl bg-gradient-to-r from-primary to-secondary-fixed px-6 py-4 font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">auto_awesome</span>
          {run.isPending ? "Generating notes…" : "Generate notes"}
        </button>
      </main>
    </div>
  );
}

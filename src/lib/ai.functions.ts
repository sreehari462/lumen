import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const NoteSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(2000),
  key_points: z.array(z.string()).max(20),
  qa: z.array(z.object({ q: z.string(), a: z.string() })).max(15),
  content_md: z.string().min(1).max(20000),
});

const InputSchema = z.object({
  text: z.string().min(20).max(80000),
  source: z.enum(["pdf", "speech"]),
  hint: z.string().max(200).optional(),
});

export const generateNotesFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");

    const { generateText, Output } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const sourceLabel = data.source === "pdf" ? "a PDF document" : "a spoken lecture transcript";
    const system = `You are a study assistant. Turn the user's raw text from ${sourceLabel} into a polished, well-structured set of study notes. Be accurate, concise, and pedagogical. Always respond with the requested JSON shape.`;

    const prompt = `Source text${data.hint ? ` (hint: ${data.hint})` : ""}:\n\n"""\n${data.text}\n"""\n\nProduce:\n- title: short topic-style title\n- summary: 2-4 sentence overview\n- key_points: 5-10 bullet points capturing the most important ideas\n- qa: 4-8 short question/answer pairs useful for self-testing\n- content_md: a clean markdown study note with headings, bullets, and clear explanations.`;

    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        prompt,
        experimental_output: Output.object({ schema: NoteSchema }),
      });
      return experimental_output;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) throw new Error("AI is rate-limited. Please try again in a moment.");
      if (msg.includes("402")) throw new Error("AI credits exhausted. Add credits in workspace billing.");
      throw new Error(`AI generation failed: ${msg}`);
    }
  });

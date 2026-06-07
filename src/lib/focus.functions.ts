import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const logFocusSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ duration_min: z.number().int().min(1).max(600) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("focus_sessions")
      .insert({ duration_min: data.duration_min });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getStudyStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Last 120 days of sessions
    const since = new Date();
    since.setDate(since.getDate() - 120);

    const { data: sessions, error } = await context.supabase
      .from("focus_sessions")
      .select("started_at, duration_min")
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: true });
    if (error) throw new Error(error.message);

    // Bucket per day (YYYY-MM-DD)
    const byDay: Record<string, number> = {};
    for (const s of sessions ?? []) {
      const d = new Date(s.started_at).toISOString().slice(0, 10);
      byDay[d] = (byDay[d] ?? 0) + s.duration_min;
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);

    const todayMin = byDay[todayKey] ?? 0;
    const yMin = byDay[yKey] ?? 0;

    // Streak: consecutive days ending today (or yesterday if no session today)
    let streak = 0;
    const cursor = new Date();
    if (!byDay[todayKey]) cursor.setDate(cursor.getDate() - 1);
    while (true) {
      const k = cursor.toISOString().slice(0, 10);
      if (byDay[k]) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }

    // Heatmap: last 12 weeks = 84 days, grouped column-by-column (each col = 1 week, 7 rows)
    const days: { date: string; minutes: number }[] = [];
    const start = new Date();
    start.setDate(start.getDate() - 83);
    for (let i = 0; i < 84; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const k = d.toISOString().slice(0, 10);
      days.push({ date: k, minutes: byDay[k] ?? 0 });
    }

    const totalMin = (sessions ?? []).reduce((acc, s) => acc + s.duration_min, 0);

    return {
      todayMin,
      yesterdayMin: yMin,
      streak,
      heatmap: days,
      totalMin,
    };
  });

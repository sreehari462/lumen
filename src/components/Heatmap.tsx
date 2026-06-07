type Day = { date: string; minutes: number };

function bucket(min: number): string {
  if (min === 0) return "bg-white/5";
  if (min < 120) return "bg-primary/20";
  if (min < 240) return "bg-primary/40";
  if (min < 360) return "bg-primary/60";
  if (min < 480) return "bg-primary/80";
  return "bg-primary";
}

export function Heatmap({ days }: { days: Day[] }) {
  // 12 weeks x 7 days, column-major (first column = oldest week)
  return (
    <div>
      <div className="grid grid-flow-col grid-rows-7 gap-1 h-32">
        {days.map((d) => (
          <div
            key={d.date}
            title={`${d.date} — ${d.minutes} min`}
            className={`heatmap-cell ${bucket(d.minutes)}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-3 px-1 text-[10px] text-outline-variant">
        <span>12 weeks ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

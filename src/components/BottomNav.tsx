import { Link, useRouterState } from "@tanstack/react-router";

const items = [
  { to: "/dashboard", icon: "home", label: "Home" },
  { to: "/notes", icon: "menu_book", label: "Notes" },
  { to: "/focus", icon: "timer", label: "Focus" },
  { to: "/tasks", icon: "task_alt", label: "Tasks" },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="glass-card rounded-full px-2 py-2 flex items-center gap-1 shadow-2xl">
        {items.map((it) => {
          const active = pathname === it.to || (it.to === "/notes" && pathname.startsWith("/notes"));
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all ${
                active
                  ? "bg-primary/30 text-primary-fixed-dim"
                  : "text-on-surface-variant hover:bg-white/5"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{it.icon}</span>
              <span className={`text-xs font-semibold ${active ? "" : "hidden sm:inline"}`}>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

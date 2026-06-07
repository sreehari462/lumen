import { Link } from "@tanstack/react-router";

export function TopAppBar({ title, back }: { title: string; back?: string }) {
  return (
    <header className="sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between backdrop-blur-xl bg-background/50 border-b border-white/5">
      <div className="flex items-center gap-3">
        {back ? (
          <Link to={back} className="rounded-full p-2 hover:bg-white/5">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-white">auto_awesome</span>
          </div>
        )}
        <h1 className="font-display text-lg font-semibold">{title}</h1>
      </div>
    </header>
  );
}

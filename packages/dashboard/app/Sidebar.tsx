"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Health" },
  { href: "/stories", label: "Stories" },
  { href: "/schedules", label: "Export Queue" },
  { href: "/outcomes", label: "Outcomes" },
  { href: "/logs", label: "Logs" },
];

export function Sidebar({ storyCount }: { storyCount: number }) {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-charcoal-soft border-r border-white/5 flex flex-col">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(168,49,28,0.6)]" />
          <div>
            <div className="text-sm font-semibold text-parchment tracking-tight">RCF</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-parchment-muted">
              Confession Factory
            </div>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="rcf-label mb-1.5">Observer</div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-xs text-parchment">Online</span>
          <span className="text-[11px] text-ink-muted ml-auto font-mono">
            {storyCount} stories
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map((l) => {
          const active = pathname === l.href || (l.href !== "/" && pathname?.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={
                "block px-3 py-2 rounded-md text-sm transition-colors " +
                (active
                  ? "bg-accent/10 text-accent-fg border-l-2 border-accent"
                  : "text-parchment-muted hover:text-parchment hover:bg-white/[0.03] border-l-2 border-transparent")
              }
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/5">
        <div className="rcf-label mb-1">Mode</div>
        <div className="text-[11px] text-parchment-muted">Observer · no approval actions</div>
      </div>
    </aside>
  );
}

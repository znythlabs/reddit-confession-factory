import "./globals.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-parchment text-ink min-h-screen">
        <header className="border-b border-neutral-300 px-6 py-4 flex items-center justify-between">
          <h1 className="font-semibold">RCF · Observer Console</h1>
          <nav className="text-sm space-x-4">
            <a href="/">Health</a>
            <a href="/stories">Stories</a>
            <a href="/schedules">Schedules</a>
            <a href="/outcomes">Outcomes</a>
            <a href="/logs">Logs</a>
          </nav>
        </header>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}

import "./globals.css";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { readHealth } from "../lib/readers";

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const h = await readHealth();
  return (
    <html lang="en">
      <body className="bg-charcoal text-parchment min-h-screen">
        <Sidebar storyCount={h.generated} />
        <main className="ml-60 min-h-screen">
          <div className="max-w-7xl mx-auto px-8 py-8">{children}</div>
        </main>
      </body>
    </html>
  );
}

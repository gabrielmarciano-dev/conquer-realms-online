import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/session";

export const Route = createFileRoute("/ranking")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ranking global — Conquest Wars" },
      {
        name: "description",
        content:
          "Veja os melhores comandantes de Conquest Wars: pontos, vitórias, derrotas e taxa de vitória.",
      },
      { property: "og:title", content: "Ranking global — Conquest Wars" },
      {
        property: "og:description",
        content: "Os melhores comandantes de Conquest Wars por pontos e vitórias.",
      },
    ],
  }),
  component: RankingPage,
});

function RankingPage() {
  const [rows, setRows] = useState<Profile[]>([]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .order("points", { ascending: false })
      .limit(50)
      .then(({ data }) => setRows((data ?? []) as Profile[]));
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10">
      <Link to="/">
        <Button variant="ghost">← Menu principal</Button>
      </Link>
      <h1 className="mt-4 font-display text-4xl font-bold text-primary">Ranking global</h1>

      <div className="panel mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["#", "Comandante", "Partidas", "Vitórias", "Derrotas", "Taxa", "Pontos"].map(
                (h) => (
                  <th key={h} className="hud-label px-4 py-3 text-left">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-display font-semibold text-primary">{i + 1}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-sm"
                      style={{ backgroundColor: p.color }}
                      aria-hidden
                    />
                    {p.username}
                  </span>
                </td>
                <td className="px-4 py-3">{p.matches}</td>
                <td className="px-4 py-3">{p.wins}</td>
                <td className="px-4 py-3">{p.losses}</td>
                <td className="px-4 py-3">
                  {p.matches ? Math.round((p.wins / p.matches) * 100) : 0}%
                </td>
                <td className="px-4 py-3 font-display font-semibold">{p.points}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum comandante classificado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

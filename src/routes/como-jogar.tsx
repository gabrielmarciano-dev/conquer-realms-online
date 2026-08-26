import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BUILDINGS, TERRAIN, UNITS } from "@/lib/game-data";

export const Route = createFileRoute("/como-jogar")({
  head: () => ({
    meta: [
      { title: "Como jogar — Conquest Wars" },
      {
        name: "description",
        content:
          "Aprenda as regras de Conquest Wars: recursos, tropas, combate, construções, diplomacia e condições de vitória.",
      },
      { property: "og:title", content: "Como jogar — Conquest Wars" },
      {
        property: "og:description",
        content:
          "Regras de Conquest Wars: recursos, tropas, combate, construções, diplomacia e vitória.",
      },
    ],
  }),
  component: HowToPlay,
});

function HowToPlay() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10">
      <Link to="/">
        <Button variant="ghost">← Menu principal</Button>
      </Link>
      <h1 className="mt-4 font-display text-4xl font-bold text-primary">Como jogar</h1>

      <section className="panel mt-6 p-6">
        <h2 className="font-display text-xl">Objetivo</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Você comanda uma nação com um território inicial, tropas, dinheiro e recursos. Expanda
          conquistando territórios vizinhos. A partida termina quando alguém controla 70% do mapa
          ou quando todos os rivais são eliminados.
        </p>
      </section>

      <section className="panel mt-4 p-6">
        <h2 className="font-display text-xl">Territórios e recursos</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(TERRAIN).map(([k, v]) => (
            <div key={k} className="rounded-md bg-muted/40 p-3 text-sm">
              <p className="font-display font-semibold">{v.label}</p>
              <p className="text-muted-foreground">
                {v.production} · Defesa: {v.defense}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          A produção é somada automaticamente ao seu estoque conforme o relógio da partida avança.
        </p>
      </section>

      <section className="panel mt-4 p-6">
        <h2 className="font-display text-xl">Tropas</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {Object.entries(UNITS).map(([k, u]) => (
            <div key={k} className="rounded-md bg-muted/40 p-3 text-sm">
              <p className="font-display font-semibold">{u.label}</p>
              <p className="text-muted-foreground">
                Ataque {u.attack} · Defesa {u.defense} · Velocidade {u.speed}
              </p>
              <p className="text-muted-foreground">
                Custo: {u.cost.money}💰 {u.cost.food}🌾 {u.cost.metal}⛭ {u.cost.energy}⚡
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel mt-4 p-6">
        <h2 className="font-display text-xl">Construções</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(BUILDINGS).map(([k, b]) => (
            <div key={k} className="rounded-md bg-muted/40 p-3 text-sm">
              <p className="font-display font-semibold">{b.label}</p>
              <p className="text-muted-foreground">
                {b.desc} — {b.money}💰 {b.metal}⛭
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel mt-4 p-6">
        <h2 className="font-display text-xl">Combate</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Selecione um território seu, escolha "Atacar", clique num território vizinho inimigo e
          defina as tropas. O sistema compara o poder de ataque enviado com a defesa do alvo,
          somando bônus de muralhas, cidades e montanhas. Vencendo, o território é conquistado
          pelas tropas sobreviventes.
        </p>
      </section>
    </main>
  );
}

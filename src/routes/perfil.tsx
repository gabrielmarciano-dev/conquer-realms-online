import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/session";
import { PLAYER_COLORS } from "@/lib/game-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ACHIEVEMENTS = [
  { key: "Primeira Vitória", desc: "Vença sua primeira partida" },
  { key: "Conquistador", desc: "Conquiste 10 territórios em partidas" },
  { key: "General", desc: "Vença 5 partidas" },
  { key: "Dominação Total", desc: "Controle 70% do mapa" },
];

export const Route = createFileRoute("/perfil")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Perfil do comandante — Conquest Wars" },
      {
        name: "description",
        content: "Estatísticas, nível, conquistas e configurações do seu comandante.",
      },
      { property: "og:title", content: "Perfil do comandante — Conquest Wars" },
      {
        property: "og:description",
        content: "Estatísticas, nível, conquistas e configurações do seu comandante.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, session, loading, setProfile } = useProfile();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  useEffect(() => {
    if (profile) setName(profile.username);
  }, [profile?.id]);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (!profile) return <div className="grid min-h-screen place-items-center">…</div>;

  async function save(patch: { username?: string; color?: string }) {
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", profile!.id)
      .select("*")
      .single();
    if (error) return toast.error("Não foi possível salvar");
    setProfile(data as typeof profile);
    toast.success("Perfil atualizado");
  }

  const winRate = profile.matches ? Math.round((profile.wins / profile.matches) * 100) : 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10">
      <Link to="/">
        <Button variant="ghost">← Menu principal</Button>
      </Link>

      <div className="panel mt-4 flex flex-wrap items-center gap-5 p-6">
        <span
          className="grid size-20 place-items-center rounded-md font-display text-3xl font-bold"
          style={{ backgroundColor: profile.color, color: "#10141c" }}
        >
          {profile.username.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold">{profile.username}</h1>
          <p className="text-sm text-muted-foreground">
            Nível {profile.level} · {profile.xp} XP · {profile.points} pontos
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        {[
          ["Partidas", profile.matches],
          ["Vitórias", profile.wins],
          ["Derrotas", profile.losses],
          ["Taxa", `${winRate}%`],
        ].map(([k, v]) => (
          <div key={String(k)} className="panel p-4 text-center">
            <p className="hud-label">{k}</p>
            <p className="font-display text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </div>

      <section className="panel mt-4 p-6">
        <h2 className="font-display text-xl">Conquistas</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = profile.achievements.includes(a.key);
            return (
              <div
                key={a.key}
                className={`rounded-md border p-3 text-sm ${
                  unlocked ? "border-primary/60 bg-primary/10" : "border-border bg-muted/30"
                }`}
              >
                <p className="font-display font-semibold">{a.key}</p>
                <p className="text-muted-foreground">{a.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel mt-4 p-6">
        <h2 className="font-display text-xl">Configurações</h2>
        <div className="mt-3 max-w-sm space-y-2">
          <Label htmlFor="name">Nome de guerra</Label>
          <div className="flex gap-2">
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={() => save({ username: name.trim() || profile.username })}>
              Salvar
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <p className="hud-label mb-2">Cor do comandante</p>
          <div className="flex flex-wrap gap-2">
            {PLAYER_COLORS.map((c) => (
              <button
                key={c}
                aria-label={`Cor ${c}`}
                onClick={() => save({ color: c })}
                className={`size-8 rounded-md border-2 ${
                  profile.color === c ? "border-primary" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          className="mt-6"
          onClick={async () => {
            await supabase.auth.signOut();
            void navigate({ to: "/auth" });
          }}
        >
          Sair da conta
        </Button>
      </section>
    </main>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/session";
import { useGame } from "@/lib/use-game";
import { leaveGame } from "@/lib/actions";
import { NATIONS } from "@/lib/game-data";
import { Chat } from "@/components/game/Chat";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/lobby/$gameId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sala de espera — Conquest Wars" },
      {
        name: "description",
        content: "Reúna os comandantes, escolha sua nação e inicie a partida.",
      },
      { property: "og:title", content: "Sala de espera — Conquest Wars" },
      {
        property: "og:description",
        content: "Reúna os comandantes, escolha sua nação e inicie a partida.",
      },
    ],
  }),
  component: LobbyPage,
});

function LobbyPage() {
  const { gameId } = Route.useParams();
  const { profile, loading } = useProfile();
  const navigate = useNavigate();
  const { game, players, messages, me } = useGame(gameId, profile?.id);

  useEffect(() => {
    if (!loading && !profile) void navigate({ to: "/auth" });
  }, [loading, profile, navigate]);

  useEffect(() => {
    if (game?.status === "active") {
      void navigate({ to: "/jogo/$gameId", params: { gameId } });
    }
  }, [game?.status, gameId, navigate]);

  if (!game || !profile) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">…</div>;
  }

  const isHost = game.host_id === profile.id;
  const readyCount = players.filter((p) => p.is_ready).length;

  async function toggleReady() {
    if (!me) return;
    await supabase.from("game_players").update({ is_ready: !me.is_ready }).eq("id", me.id);
  }

  async function changeNation(nation: string) {
    if (!me) return;
    await supabase.from("game_players").update({ nation }).eq("id", me.id);
  }

  async function start() {
    const { error } = await supabase.rpc("rpc_start_game", { p_game: gameId });
    if (error) toast.error(error.message);
  }

  async function exit() {
    await leaveGame(gameId, profile!.id);
    if (isHost) await supabase.from("games").delete().eq("id", gameId);
    void navigate({ to: "/" });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">{game.name}</h1>
          <p className="hud-label mt-1">
            Mapa {game.map} · Modo {game.mode} · {players.length}/{game.max_players} comandantes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={exit}>
            {isHost ? "Cancelar partida" : "Sair da sala"}
          </Button>
          <Button variant={me?.is_ready ? "secondary" : "default"} onClick={toggleReady}>
            {me?.is_ready ? "Pronto ✓" : "Pronto"}
          </Button>
          {isHost && (
            <Button onClick={start} disabled={players.length < 2}>
              Iniciar partida
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="panel p-5">
          <h2 className="font-display text-lg">
            Comandantes ({readyCount} prontos)
          </h2>
          <div className="mt-4 space-y-2">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/70 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="size-6 rounded-sm"
                    style={{ backgroundColor: p.color }}
                    aria-hidden
                  />
                  <div>
                    <p className="font-display font-semibold">
                      {p.username} {p.user_id === game.host_id && "★"}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.nation}</p>
                  </div>
                </div>
                <span
                  className={`hud-label ${p.is_ready ? "text-food" : "text-muted-foreground"}`}
                >
                  {p.is_ready ? "Pronto" : "Aguardando"}
                </span>
              </div>
            ))}
          </div>

          {me && (
            <div className="mt-5 max-w-xs">
              <p className="hud-label mb-2">Sua nação</p>
              <Select value={me.nation} onValueChange={changeNation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NATIONS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </section>

        <aside className="panel flex h-[480px] flex-col p-5">
          <h2 className="mb-3 font-display text-lg">Chat da sala</h2>
          <Chat gameId={gameId} me={me} messages={messages} />
        </aside>
      </div>
    </main>
  );
}

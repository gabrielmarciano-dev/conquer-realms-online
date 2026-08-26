import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/session";
import { createGame, joinGame } from "@/lib/actions";
import type { Game } from "@/lib/use-game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Conquest Wars — Jogo de estratégia territorial online" },
      {
        name: "description",
        content:
          "Comande uma nação, administre recursos, recrute exércitos e conquiste o mapa contra até 8 jogadores em tempo real.",
      },
      { property: "og:title", content: "Conquest Wars — Estratégia territorial online" },
      {
        property: "og:description",
        content:
          "Comande uma nação, administre recursos, recrute exércitos e conquiste o mapa contra até 8 jogadores em tempo real.",
      },
    ],
  }),
  component: MainMenu,
});

function MainMenu() {
  const { session, profile, loading } = useProfile();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [onlineCount, setOnlineCount] = useState(1);

  async function loadGames() {
    const { data } = await supabase
      .from("games")
      .select("*")
      .in("status", ["lobby", "active"])
      .order("created_at", { ascending: false })
      .limit(30);
    const list = (data ?? []) as Game[];
    setGames(list);
    if (list.length) {
      const { data: gp } = await supabase
        .from("game_players")
        .select("game_id")
        .in(
          "game_id",
          list.map((g) => g.id),
        );
      const c: Record<string, number> = {};
      for (const row of gp ?? []) c[row.game_id] = (c[row.game_id] ?? 0) + 1;
      setCounts(c);
    }
  }

  useEffect(() => {
    if (!session) return;
    void loadGames();
    const ch = supabase
      .channel("lobby-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () =>
        loadGames(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players" }, () =>
        loadGames(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!profile) return;
    const presence = supabase.channel("online-commanders", {
      config: { presence: { key: profile.id } },
    });
    presence
      .on("presence", { event: "sync" }, () => {
        setOnlineCount(Object.keys(presence.presenceState()).length);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void presence.track({ at: Date.now() });
      });
    return () => {
      void supabase.removeChannel(presence);
    };
  }, [profile?.id]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">…</div>;
  }

  if (!session || !profile) return <Landing />;

  async function enter(g: Game) {
    try {
      if (g.status === "active") {
        const { data } = await supabase
          .from("game_players")
          .select("id")
          .eq("game_id", g.id)
          .eq("user_id", profile!.id)
          .maybeSingle();
        if (!data) throw new Error("Partida em andamento");
        void navigate({ to: "/jogo/$gameId", params: { gameId: g.id } });
        return;
      }
      let pass: string | undefined;
      if (g.password) {
        pass = window.prompt("Senha da partida") ?? "";
      }
      await joinGame(g, profile!.id, profile!.username, pass);
      void navigate({ to: "/lobby/$gameId", params: { gameId: g.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível entrar");
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-[0.18em] text-primary">
            CONQUEST WARS
          </h1>
          <p className="hud-label mt-1">Comando estratégico global</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
            <span className="size-2 rounded-full bg-food [animation:cw-pulse_2s_infinite]" />
            {onlineCount} online
          </span>
          <Link to="/perfil">
            <Button variant="secondary">Perfil</Button>
          </Link>
          <Link to="/ranking">
            <Button variant="secondary">Ranking</Button>
          </Link>
          <Button
            variant="ghost"
            onClick={async () => {
              await supabase.auth.signOut();
              void navigate({ to: "/auth" });
            }}
          >
            Sair
          </Button>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Partidas disponíveis</h2>
            <div className="flex gap-2">
              <CreateGameDialog
                profile={profile}
                onCreated={(id) => navigate({ to: "/lobby/$gameId", params: { gameId: id } })}
              />
              <Link to="/como-jogar">
                <Button variant="secondary">Como jogar</Button>
              </Link>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {games.length === 0 && (
              <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nenhuma operação ativa. Crie a primeira partida.
              </p>
            )}
            {games.map((g) => (
              <div
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/70 px-4 py-3 transition-colors hover:border-primary/60"
              >
                <div>
                  <p className="font-display text-lg font-semibold">
                    {g.name} {g.password ? "🔒" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mapa {g.map} · Modo {g.mode} ·{" "}
                    {g.status === "lobby" ? "Aguardando" : "Em andamento"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="hud-label">
                    {counts[g.id] ?? 0}/{g.max_players}
                  </span>
                  <Button size="sm" onClick={() => enter(g)}>
                    {g.status === "lobby" ? "Entrar" : "Retomar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="panel h-fit p-6">
          <div className="flex items-center gap-3">
            <span
              className="grid size-12 place-items-center rounded-md font-display text-xl font-bold"
              style={{ backgroundColor: profile.color, color: "#10141c" }}
            >
              {profile.username.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="font-display text-lg font-semibold">{profile.username}</p>
              <p className="text-xs text-muted-foreground">
                Nível {profile.level} · {profile.points} pts
              </p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              ["Partidas", profile.matches],
              ["Vitórias", profile.wins],
              ["Derrotas", profile.losses],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-md bg-muted/50 p-3">
                <dt className="hud-label">{k}</dt>
                <dd className="font-display text-xl font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <Link to="/perfil" className="mt-4 block">
            <Button variant="secondary" className="w-full">
              Ver perfil completo
            </Button>
          </Link>
        </aside>
      </div>
    </main>
  );
}

function Landing() {
  return (
    <main className="grid min-h-screen place-items-center px-6 command-bg">
      <div className="max-w-2xl text-center">
        <h1 className="font-display text-6xl font-bold tracking-[0.2em] text-primary">
          CONQUEST WARS
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Estratégia territorial online para 2 a 8 comandantes. Controle territórios, produza
          recursos, recrute exércitos e domine o mapa em tempo real.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/auth">
            <Button size="lg">Jogar</Button>
          </Link>
          <Link to="/como-jogar">
            <Button size="lg" variant="secondary">
              Como jogar
            </Button>
          </Link>
          <Link to="/ranking">
            <Button size="lg" variant="ghost">
              Ranking
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

function CreateGameDialog({
  profile,
  onCreated,
}: {
  profile: { id: string; username: string };
  onCreated: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Operação Relâmpago");
  const [maxPlayers, setMaxPlayers] = useState("4");
  const [map, setMap] = useState("continental");
  const [mode, setMode] = useState("domination");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const g = await createGame({
        name: name.trim() || "Nova operação",
        maxPlayers: Number(maxPlayers),
        map,
        mode,
        password: password.trim() || null,
        userId: profile.id,
        username: profile.username,
      });
      setOpen(false);
      onCreated(g.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar partida");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Criar partida</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Nova operação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da partida</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Máx. de jogadores</Label>
              <Select value={maxPlayers} onValueChange={setMaxPlayers}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} jogadores
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mapa</Label>
              <Select value={map} onValueChange={setMap}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="continental">Continental</SelectItem>
                  <SelectItem value="fronteiras">Fronteiras</SelectItem>
                  <SelectItem value="arquipelago">Arquipélago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Modo</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="domination">Dominação</SelectItem>
                  <SelectItem value="score">Pontuação</SelectItem>
                  <SelectItem value="elimination">Eliminação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Senha (opcional)</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/session";
import {
  useGame,
  type Diplomacy,
  type GamePlayer,
  type QueuedAction,
  type Territory,
} from "@/lib/use-game";
import { leaveGame } from "@/lib/actions";
import {
  BUILDINGS,
  TERRAIN,
  UNITS,
  formatClock,
  type BuildingKey,
  type UnitKey,
} from "@/lib/game-data";
import { MapView } from "@/components/game/MapView";
import { Chat } from "@/components/game/Chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/jogo/$gameId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mapa de operações — Conquest Wars" },
      {
        name: "description",
        content:
          "Comande seus exércitos no mapa: produza recursos, construa estruturas, mova tropas e conquiste territórios.",
      },
      { property: "og:title", content: "Mapa de operações — Conquest Wars" },
      {
        property: "og:description",
        content: "Comande seus exércitos, construa estruturas e conquiste territórios.",
      },
    ],
  }),
  component: GamePage,
});

type Mode = "idle" | "attack" | "move";

function GamePage() {
  const { gameId } = Route.useParams();
  const { profile, loading } = useProfile();
  const navigate = useNavigate();
  const { game, players, territories, messages, diplomacy, queue, me, refresh } = useGame(
    gameId,
    profile?.id,
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [dialog, setDialog] = useState<null | "build" | "recruit" | "diplomacy" | "troops">(null);
  const [pendingTarget, setPendingTarget] = useState<Territory | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [inf, setInf] = useState(0);
  const [tank, setTank] = useState(0);
  const [art, setArt] = useState(0);

  useEffect(() => {
    if (!loading && !profile) void navigate({ to: "/auth" });
  }, [loading, profile, navigate]);

  const selected = territories.find((t) => t.id === selectedId) ?? null;
  const mine = selected && me && selected.owner_player_id === me.id;

  const neighborTargets = useMemo(() => {
    if (!selected || mode === "idle") return [];
    return territories.filter(
      (t) =>
        selected.neighbors.includes(t.idx) &&
        (mode === "attack"
          ? t.owner_player_id !== selected.owner_player_id
          : t.owner_player_id === selected.owner_player_id),
    );
  }, [selected, territories, mode]);

  const myTerritories = territories.filter((t) => me && t.owner_player_id === me.id);
  const myTroops = myTerritories.reduce((a, t) => a + t.infantry + t.tanks + t.artillery, 0);

  const selectedQueue = useMemo(
    () => (selected ? queue.filter((q) => q.territory_id === selected.id) : []),
    [selected, queue],
  );
  const pendingBuildKeys = new Set(
    selectedQueue.filter((q) => q.kind === "build").map((q) => q.payload.building),
  );
  const pendingRecruits = selectedQueue.filter((q) => q.kind === "recruit");
  const incomingMoves = selectedQueue.filter((q) => q.kind === "move");

  function onSelect(t: Territory) {
    if (mode !== "idle" && selected) {
      if (neighborTargets.some((n) => n.id === t.id)) {
        setPendingTarget(t);
        setInf(0);
        setTank(0);
        setArt(0);
        setDialog("troops");
        return;
      }
      if (t.id !== selected.id) {
        toast.error(
          mode === "attack"
            ? "Alvo inválido: escolha um território vizinho inimigo."
            : "Alvo inválido: escolha um território vizinho aliado.",
        );
        return;
      }
      // clicking the already-selected territory again cancels the mode
      setMode("idle");
      return;
    }
    setSelectedId(t.id);
    setMode("idle");
  }

  async function confirmTroops() {
    if (!selected || !pendingTarget) return;
    try {
      if (mode === "attack") {
        const { data, error } = await supabase.rpc("rpc_attack", {
          p_from: selected.id,
          p_to: pendingTarget.id,
          p_inf: inf,
          p_tank: tank,
          p_art: art,
        });
        if (error) throw error;
        const res = data as { won: boolean; attacker_losses: number; defender_losses: number };
        await refresh();
        setFlashId(pendingTarget.id);
        setTimeout(() => setFlashId(null), 900);
        toast[res.won ? "success" : "error"](
          res.won
            ? `Território conquistado! Baixas: ${res.attacker_losses} suas, ${res.defender_losses} inimigas.`
            : `Ataque repelido. Baixas: ${res.attacker_losses} suas, ${res.defender_losses} inimigas.`,
        );
      } else {
        const { error } = await supabase.rpc("rpc_move", {
          p_from: selected.id,
          p_to: pendingTarget.id,
          p_inf: inf,
          p_tank: tank,
          p_art: art,
        });
        if (error) throw error;
        await refresh();
        toast.success("Tropas a caminho");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ação inválida");
    } finally {
      void refresh();
      setDialog(null);
      setPendingTarget(null);
      setMode("idle");
    }
  }

  async function build(key: BuildingKey) {
    if (!selected) return;
    const { error } = await supabase.rpc("rpc_build", {
      p_terr: selected.id,
      p_building: key,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success(`${BUILDINGS[key].label} em construção`);
  }

  async function recruit(unit: UnitKey, qty: number) {
    if (!selected) return;
    const { error } = await supabase.rpc("rpc_recruit", {
      p_terr: selected.id,
      p_unit: unit,
      p_qty: qty,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success(`${qty}x ${UNITS[unit].label} em recrutamento`);
  }

  if (!game || !profile) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">…</div>;
  }

  if (game.status === "finished") {
    return <ResultScreen game={game} players={players} territories={territories} />;
  }

  const owner = selected?.owner_player_id
    ? players.find((p) => p.id === selected.owner_player_id)
    : null;

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      {/* TOP HUD */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card/80 px-5 py-2.5">
        <div className="flex items-center gap-5">
          <span className="font-display text-lg font-bold tracking-widest text-primary">
            CONQUEST WARS
          </span>
          <span className="hud-label">{formatClock(game.clock_minutes)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Res label="Dinheiro" value={me?.money} className="text-gold" />
          <Res label="Comida" value={me?.food} className="text-food" />
          <Res label="Metal" value={me?.metal} className="text-metal" />
          <Res label="Energia" value={me?.energy} className="text-energy" />
          <Res label="Territórios" value={myTerritories.length} />
          <Res label="Tropas" value={myTroops} />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr_280px]">
        {/* LEFT: selected territory */}
        <aside className="min-h-0 overflow-y-auto border-r border-border bg-card/50 p-4">
          <h2 className="hud-label">Território selecionado</h2>
          {!selected && (
            <p className="mt-3 text-sm text-muted-foreground">
              Clique em um território no mapa para ver detalhes.
            </p>
          )}
          {selected && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="font-display text-2xl font-semibold">{selected.name}</p>
                <p className="text-sm" style={{ color: owner?.color ?? undefined }}>
                  {owner ? `${owner.username} · ${owner.nation}` : "Território neutro"}
                </p>
              </div>
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                <p className="font-display">{TERRAIN[selected.ttype].label}</p>
                <p className="text-muted-foreground">{TERRAIN[selected.ttype].production}</p>
                <p className="text-muted-foreground">
                  Defesa do terreno: {TERRAIN[selected.ttype].defense}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Inf.", selected.infantry],
                  ["Tanq.", selected.tanks],
                  ["Art.", selected.artillery],
                ].map(([k, v]) => (
                  <div key={String(k)} className="rounded-md bg-muted/40 p-2">
                    <p className="hud-label">{k}</p>
                    <p className="font-display text-lg">{v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="hud-label">Estruturas</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {Object.keys(selected.buildings).length === 0
                    ? "Nenhuma"
                    : Object.entries(selected.buildings)
                        .map(([k, v]) =>
                          k === "wall"
                            ? `Muralha nv.${v}`
                            : (BUILDINGS[k as BuildingKey]?.label ?? k),
                        )
                        .join(", ")}
                </p>
              </div>
              {selectedQueue.length > 0 && (
                <div>
                  <p className="hud-label">Em andamento</p>
                  <div className="mt-1 space-y-1">
                    {pendingBuildKeys.size > 0 &&
                      selectedQueue
                        .filter((q) => q.kind === "build")
                        .map((q) => (
                          <QueueRow
                            key={q.id}
                            label={`Construindo ${BUILDINGS[q.payload.building as BuildingKey]?.label ?? q.payload.building}`}
                            completeAt={q.complete_at}
                          />
                        ))}
                    {pendingRecruits.map((q) => (
                      <QueueRow
                        key={q.id}
                        label={`Recrutando ${q.payload.qty}x ${UNITS[q.payload.unit as UnitKey]?.label ?? q.payload.unit}`}
                        completeAt={q.complete_at}
                      />
                    ))}
                    {incomingMoves.map((q) => (
                      <QueueRow
                        key={q.id}
                        label={`Tropas chegando: ${q.payload.inf ?? 0}inf ${q.payload.tank ?? 0}tq ${q.payload.art ?? 0}art`}
                        completeAt={q.complete_at}
                      />
                    ))}
                  </div>
                </div>
              )}
              {mine && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={mode === "attack" ? "default" : "secondary"}
                    onClick={() => setMode(mode === "attack" ? "idle" : "attack")}
                  >
                    Atacar
                  </Button>
                  <Button
                    size="sm"
                    variant={mode === "move" ? "default" : "secondary"}
                    onClick={() => setMode(mode === "move" ? "idle" : "move")}
                  >
                    Mover tropas
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setDialog("build")}>
                    Construir
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setDialog("recruit")}>
                    Recrutar
                  </Button>
                </div>
              )}
              {mode !== "idle" && (
                <p className="rounded-md border border-primary/50 bg-primary/10 p-2 text-xs">
                  Selecione um território vizinho {mode === "attack" ? "inimigo" : "aliado"} no
                  mapa.
                </p>
              )}
            </div>
          )}
        </aside>

        {/* CENTER: map */}
        <section className="relative min-h-0 bg-background p-2">
          <MapView
            territories={territories}
            players={players}
            selectedId={selectedId}
            targetIds={neighborTargets.map((t) => t.id)}
            onSelect={onSelect}
            pendingArrow={selected && pendingTarget ? { from: selected, to: pendingTarget } : null}
            flashId={flashId}
          />
        </section>

        {/* RIGHT: players */}
        <aside className="min-h-0 overflow-y-auto border-l border-border bg-card/50 p-4">
          <h2 className="hud-label">Ranking da partida</h2>
          <div className="mt-3 space-y-2">
            {[...players]
              .map((p) => ({
                p,
                terr: territories.filter((t) => t.owner_player_id === p.id).length,
              }))
              .sort((a, b) => b.terr - a.terr)
              .map(({ p, terr }, i) => (
                <div
                  key={p.id}
                  className="rounded-md border border-border bg-card/70 p-2.5 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-sm"
                        style={{ backgroundColor: p.color }}
                        aria-hidden
                      />
                      <span className="font-display font-semibold">
                        {i + 1}. {p.username}
                      </span>
                    </span>
                    {p.eliminated && <span className="hud-label text-destructive">fora</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {terr} territórios · {p.score} pts · {p.troops_killed} baixas
                  </p>
                  <p className="text-xs" style={{ color: p.color }}>
                    {p.nation}
                  </p>
                </div>
              ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4 w-full"
            onClick={() => setDialog("diplomacy")}
          >
            Diplomacia
          </Button>
          <div className="mt-4 h-64">
            <Chat gameId={gameId} me={me} messages={messages} allowAllies />
          </div>
        </aside>
      </div>

      {/* BOTTOM BAR */}
      <footer className="flex items-center justify-between gap-3 border-t border-border bg-card/80 px-5 py-2">
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" disabled={!mine} onClick={() => setDialog("build")}>
            Construir
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!mine}
            onClick={() => setDialog("recruit")}
          >
            Recrutar
          </Button>
          <Button size="sm" variant="secondary" disabled={!mine} onClick={() => setMode("move")}>
            Mover
          </Button>
          <Button size="sm" variant="secondary" disabled={!mine} onClick={() => setMode("attack")}>
            Atacar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDialog("diplomacy")}>
            Diplomacia
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="hud-label">Velocidade</span>
          {[1, 2, 4, 8].map((s) => (
            <button
              key={s}
              disabled={game.host_id !== profile.id}
              title={
                game.host_id !== profile.id
                  ? "Somente o anfitrião pode mudar a velocidade"
                  : undefined
              }
              onClick={async () => {
                const { error } = await supabase.rpc("rpc_set_speed", {
                  p_game: gameId,
                  p_speed: s,
                });
                if (error) {
                  toast.error(error.message);
                  return;
                }
                await refresh();
                toast.success(`Velocidade ${s}x`);
              }}
              className={`hud-label rounded px-2 py-1 ${
                game.speed === s ? "bg-primary text-primary-foreground" : "bg-muted/60"
              } ${game.host_id !== profile.id ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
              {s}x
            </button>
          ))}
          <Link to="/">
            <Button size="sm" variant="ghost">
              Menu
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await leaveGame(gameId, profile.id);
              void navigate({ to: "/" });
            }}
          >
            Sair da partida
          </Button>
        </div>
      </footer>

      {/* DIALOGS */}
      <Dialog open={dialog === "troops"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {mode === "attack" ? "Atacar" : "Mover para"} {pendingTarget?.name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <TroopInput
                label={`Infantaria (máx. ${selected.infantry})`}
                value={inf}
                max={selected.infantry}
                onChange={setInf}
              />
              <TroopInput
                label={`Tanques (máx. ${selected.tanks})`}
                value={tank}
                max={selected.tanks}
                onChange={setTank}
              />
              <TroopInput
                label={`Artilharia (máx. ${selected.artillery})`}
                value={art}
                max={selected.artillery}
                onChange={setArt}
              />
              <p className="text-sm text-muted-foreground">
                Poder de ataque estimado:{" "}
                <span className="font-display text-foreground">
                  {(inf * 1 + tank * 3.5 + art * 2.5).toFixed(1)}
                </span>
                {pendingTarget && mode === "attack" && (
                  <>
                    {" "}
                    · Defesa alvo:{" "}
                    <span className="font-display text-foreground">
                      {(
                        (pendingTarget.infantry * 1.2 +
                          pendingTarget.tanks * 3 +
                          pendingTarget.artillery * 1.5) *
                        (1 + Number(pendingTarget.buildings["wall"] ?? 0) * 0.25)
                      ).toFixed(1)}
                    </span>
                  </>
                )}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={confirmTroops} disabled={inf + tank + art === 0}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "build"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Construir em {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(Object.keys(BUILDINGS) as BuildingKey[]).map((k) => (
              <div
                key={k}
                className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-3"
              >
                <div>
                  <p className="font-display font-semibold">{BUILDINGS[k].label}</p>
                  <p className="text-xs text-muted-foreground">
                    {BUILDINGS[k].desc} · {BUILDINGS[k].money}💰 {BUILDINGS[k].metal}⛭
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={
                    pendingBuildKeys.has(k) ||
                    Boolean(selected && k !== "wall" && k in selected.buildings)
                  }
                  onClick={() => build(k)}
                >
                  {pendingBuildKeys.has(k) ? "Em construção…" : "Construir"}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "recruit"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Recrutar em {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(Object.keys(UNITS) as UnitKey[]).map((k) => (
              <RecruitRow key={k} unit={k} onRecruit={(q) => recruit(k, q)} />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "diplomacy"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Diplomacia</DialogTitle>
          </DialogHeader>
          <DiplomacyPanel
            gameId={gameId}
            me={me}
            players={players}
            diplomacy={diplomacy}
            refresh={refresh}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Res({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number | undefined;
  className?: string;
}) {
  return (
    <span className="flex flex-col leading-tight">
      <span className="hud-label">{label}</span>
      <span className={`font-display text-base font-semibold ${className}`}>
        {Math.floor(value ?? 0)}
      </span>
    </span>
  );
}

function QueueRow({ label, completeAt }: { label: string; completeAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, Math.ceil((new Date(completeAt).getTime() - now) / 1000));
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-display">{remaining}s</span>
    </div>
  );
}

function TroopInput({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type="number"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => onChange(max)}>
          Máx
        </Button>
      </div>
    </div>
  );
}

function RecruitRow({ unit, onRecruit }: { unit: UnitKey; onRecruit: (q: number) => void }) {
  const [qty, setQty] = useState(1);
  const u = UNITS[unit];
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-3">
      <div>
        <p className="font-display font-semibold">{u.label}</p>
        <p className="text-xs text-muted-foreground">
          Atq {u.attack} · Def {u.defense} · {u.cost.money}💰 {u.cost.food}🌾 {u.cost.metal}⛭{" "}
          {u.cost.energy}⚡
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          className="w-20"
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
        />
        <Button size="sm" onClick={() => onRecruit(qty)}>
          Recrutar
        </Button>
      </div>
    </div>
  );
}

function DiplomacyPanel({
  gameId,
  me,
  players,
  diplomacy,
  refresh,
}: {
  gameId: string;
  me: GamePlayer | null;
  players: GamePlayer[];
  diplomacy: Diplomacy[];
  refresh: () => void;
}) {
  if (!me) return <p className="text-sm text-muted-foreground">Você é apenas espectador.</p>;

  const statusWith = (other: GamePlayer) =>
    diplomacy.find((d) => d.from_player === me.id && d.to_player === other.id)?.status ?? "neutral";

  const LABEL: Record<string, string> = {
    neutral: "Neutro",
    war: "Em guerra",
    alliance: "Aliança",
    peace_offer: "Paz proposta",
    alliance_offer: "Aliança proposta",
  };

  async function act(target: string, status: string) {
    const { error } = await supabase.rpc("rpc_diplomacy", {
      p_game: gameId,
      p_target: target,
      p_status: status as Diplomacy["status"],
    });
    if (error) toast.error(error.message);
    else toast.success("Status diplomático atualizado");
    void refresh();
  }

  return (
    <div className="space-y-2">
      {players
        .filter((p) => p.id !== me.id)
        .map((p) => (
          <div key={p.id} className="rounded-md bg-muted/40 p-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold" style={{ color: p.color }}>
                {p.username}
              </span>
              <span className="hud-label">{LABEL[statusWith(p)]}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => act(p.id, "peace_offer")}>
                Propor paz
              </Button>
              <Button size="sm" variant="secondary" onClick={() => act(p.id, "alliance")}>
                Aliança
              </Button>
              <Button size="sm" variant="secondary" onClick={() => act(p.id, "neutral")}>
                Cancelar aliança
              </Button>
              <Button size="sm" variant="destructive" onClick={() => act(p.id, "war")}>
                Declarar guerra
              </Button>
            </div>
          </div>
        ))}
    </div>
  );
}

function ResultScreen({
  game,
  players,
  territories,
}: {
  game: { winner_id: string | null; started_at: string | null; finished_at: string | null };
  players: GamePlayer[];
  territories: Territory[];
}) {
  const ranked = [...players]
    .map((p) => ({
      p,
      terr: territories.filter((t) => t.owner_player_id === p.id).length,
    }))
    .sort((a, b) => b.terr - a.terr || b.p.score - a.p.score);
  const winner = players.find((p) => p.id === game.winner_id);
  const duration =
    game.started_at && game.finished_at
      ? Math.round(
          (new Date(game.finished_at).getTime() - new Date(game.started_at).getTime()) / 60000,
        )
      : 0;

  return (
    <main className="grid min-h-screen place-items-center px-6 py-10 command-bg">
      <div className="panel w-full max-w-2xl p-8">
        <p className="hud-label">Fim da partida</p>
        <h1 className="mt-1 font-display text-4xl font-bold text-primary">
          {winner ? `${winner.username} venceu!` : "Partida encerrada"}
        </h1>
        {winner && <p className="text-sm text-muted-foreground">{winner.nation}</p>}
        <p className="mt-2 text-sm text-muted-foreground">Duração: {duration} minutos</p>

        <div className="mt-6 space-y-2">
          {ranked.map(({ p, terr }, i) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md border border-border bg-card/70 px-4 py-3"
            >
              <span className="flex items-center gap-2">
                <span className="font-display text-lg text-primary">{i + 1}º</span>
                <span className="size-3 rounded-sm" style={{ backgroundColor: p.color }} />
                <span className="font-display font-semibold">{p.username}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {terr} territórios · {p.score} pts · {p.troops_killed} tropas eliminadas
              </span>
            </div>
          ))}
        </div>

        <div className="mt-7 flex gap-3">
          <Link to="/">
            <Button>Menu principal</Button>
          </Link>
          <Link to="/ranking">
            <Button variant="secondary">Ver ranking</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

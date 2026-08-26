import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Game = {
  id: string;
  name: string;
  host_id: string;
  max_players: number;
  map: string;
  mode: string;
  password: string | null;
  status: "lobby" | "active" | "finished";
  speed: number;
  clock_minutes: number;
  winner_id: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export type GamePlayer = {
  id: string;
  game_id: string;
  user_id: string;
  username: string;
  color: string;
  nation: string;
  is_ready: boolean;
  money: number;
  food: number;
  metal: number;
  energy: number;
  score: number;
  troops_killed: number;
  eliminated: boolean;
  joined_at: string;
};

export type Territory = {
  id: string;
  game_id: string;
  idx: number;
  name: string;
  ttype: "city" | "farm" | "industry" | "energy" | "plain" | "mountain";
  owner_player_id: string | null;
  infantry: number;
  tanks: number;
  artillery: number;
  buildings: Record<string, boolean | number>;
  is_capital: boolean;
  x: number;
  y: number;
  neighbors: number[];
};

export type ChatMessage = {
  id: string;
  game_id: string;
  user_id: string;
  username: string;
  color: string;
  channel: string;
  content: string;
  created_at: string;
};

export type Diplomacy = {
  id: string;
  game_id: string;
  from_player: string;
  to_player: string;
  status: "neutral" | "war" | "alliance" | "peace_offer" | "alliance_offer";
};

export type QueuedAction = {
  id: string;
  game_id: string;
  player_id: string;
  kind: "build" | "recruit" | "move";
  territory_id: string;
  from_territory_id: string | null;
  payload: {
    building?: string;
    unit?: string;
    qty?: number;
    inf?: number;
    tank?: number;
    art?: number;
  };
  complete_at: string;
  done: boolean;
};

export function useGame(gameId: string, userId: string | undefined) {
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [diplomacy, setDiplomacy] = useState<Diplomacy[]>([]);
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const [g, p, t, m, d, q] = await Promise.all([
        supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
        supabase.from("game_players").select("*").eq("game_id", gameId).order("joined_at"),
        supabase.from("territories").select("*").eq("game_id", gameId).order("idx"),
        supabase.from("messages").select("*").eq("game_id", gameId).order("created_at").limit(100),
        supabase.from("diplomacy").select("*").eq("game_id", gameId),
        supabase.from("action_queue").select("*").eq("game_id", gameId).eq("done", false),
      ]);
      if (!mounted.current) return;
      setGame((g.data as Game) ?? null);
      setPlayers((p.data as GamePlayer[]) ?? []);
      setTerritories((t.data as Territory[]) ?? []);
      setMessages((m.data as ChatMessage[]) ?? []);
      setDiplomacy((d.data as Diplomacy[]) ?? []);
      setQueue((q.data as QueuedAction[]) ?? []);
    } catch (error) {
      console.error("Erro ao atualizar o estado do jogo:", error);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    mounted.current = true;
    void refresh();

    const onWindowFocus = () => {
      void refresh();
    };
    const onVisibilityChange = () => {
      if (!document.hidden) void refresh();
    };
    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${gameId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "territories", filter: `game_id=eq.${gameId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `game_id=eq.${gameId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "diplomacy", filter: `game_id=eq.${gameId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "action_queue", filter: `game_id=eq.${gameId}` },
        () => void refresh(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void refresh();
      });
    return () => {
      mounted.current = false;
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [gameId, refresh]);

  // Single source of truth for game time: the server-side game tick.
  // It resolves the action queue (build/recruit/move) and produces
  // resources, all scaled by games.speed — never the browser's clock.
  // Polled at a fixed 3s cadence regardless of speed: the *duration* of
  // in-game actions is what speed changes, not how often we poll for them.
  useEffect(() => {
    if (game?.status !== "active") return;
    const id = setInterval(() => {
      void supabase.rpc("rpc_tick", { p_game: gameId }).then(() => void refresh());
    }, 3000);
    void supabase.rpc("rpc_tick", { p_game: gameId }).then(() => void refresh());
    return () => clearInterval(id);
  }, [gameId, game?.status, refresh]);

  const me = players.find((p) => p.user_id === userId) ?? null;

  return { game, players, territories, messages, diplomacy, queue, me, loading, refresh };
}

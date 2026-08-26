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

export function useGame(gameId: string, userId: string | undefined) {
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [diplomacy, setDiplomacy] = useState<Diplomacy[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const [g, p, t, m, d] = await Promise.all([
      supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
      supabase.from("game_players").select("*").eq("game_id", gameId).order("joined_at"),
      supabase.from("territories").select("*").eq("game_id", gameId).order("idx"),
      supabase.from("messages").select("*").eq("game_id", gameId).order("created_at").limit(100),
      supabase.from("diplomacy").select("*").eq("game_id", gameId),
    ]);
    if (!mounted.current) return;
    setGame((g.data as Game) ?? null);
    setPlayers((p.data as GamePlayer[]) ?? []);
    setTerritories((t.data as Territory[]) ?? []);
    setMessages((m.data as ChatMessage[]) ?? []);
    setDiplomacy((d.data as Diplomacy[]) ?? []);
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
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
      .subscribe();
    return () => {
      mounted.current = false;
      void supabase.removeChannel(channel);
    };
  }, [gameId, refresh]);

  // Economy tick driver — resources are produced server-side.
  useEffect(() => {
    if (game?.status !== "active") return;
    const id = setInterval(() => {
      void supabase.rpc("rpc_tick", { p_game: gameId });
    }, 10000);
    void supabase.rpc("rpc_tick", { p_game: gameId });
    return () => clearInterval(id);
  }, [gameId, game?.status]);

  const me = players.find((p) => p.user_id === userId) ?? null;

  return { game, players, territories, messages, diplomacy, me, loading, refresh };
}

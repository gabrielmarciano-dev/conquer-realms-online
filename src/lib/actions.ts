import { supabase } from "@/integrations/supabase/client";
import { NATIONS, PLAYER_COLORS } from "./game-data";
import type { Game, GamePlayer } from "./use-game";

export async function createGame(opts: {
  name: string;
  maxPlayers: number;
  map: string;
  mode: string;
  password: string | null;
  userId: string;
  username: string;
}) {
  const { data, error } = await supabase
    .from("games")
    .insert({
      name: opts.name,
      host_id: opts.userId,
      max_players: opts.maxPlayers,
      map: opts.map,
      mode: opts.mode,
      password: opts.password,
    })
    .select("*")
    .single();
  if (error) throw error;
  await joinGame(data as Game, opts.userId, opts.username, opts.password ?? undefined);
  return data as Game;
}

export async function joinGame(
  game: Game,
  userId: string,
  username: string,
  password?: string,
) {
  const { data: existing } = await supabase
    .from("game_players")
    .select("*")
    .eq("game_id", game.id);
  const players = (existing ?? []) as GamePlayer[];
  if (players.some((p) => p.user_id === userId)) return;
  if (game.password && game.password !== password) throw new Error("Senha incorreta");
  if (players.length >= game.max_players) throw new Error("Partida lotada");
  if (game.status !== "lobby") throw new Error("Partida já iniciada");

  const takenColors = new Set(players.map((p) => p.color));
  const color = PLAYER_COLORS.find((c) => !takenColors.has(c)) ?? PLAYER_COLORS[0]!;
  const takenNations = new Set(players.map((p) => p.nation));
  const nation = NATIONS.find((n) => !takenNations.has(n)) ?? NATIONS[0]!;

  const { error } = await supabase
    .from("game_players")
    .insert({ game_id: game.id, user_id: userId, username, color, nation });
  if (error) throw error;
}

export async function leaveGame(gameId: string, userId: string) {
  await supabase.from("game_players").delete().eq("game_id", gameId).eq("user_id", userId);
}

export async function sendMessage(
  gameId: string,
  player: { user_id: string; username: string; color: string },
  content: string,
  channel: "all" | "allies",
) {
  if (!content.trim()) return;
  await supabase.from("messages").insert({
    game_id: gameId,
    user_id: player.user_id,
    username: player.username,
    color: player.color,
    channel,
    content: content.trim().slice(0, 400),
  });
}

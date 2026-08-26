import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PLAYER_COLORS } from "./game-data";

export type Profile = {
  id: string;
  username: string;
  color: string;
  level: number;
  xp: number;
  matches: number;
  wins: number;
  losses: number;
  points: number;
  achievements: string[];
};

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export async function ensureProfile(userId: string, fallbackName: string) {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (data) return data as Profile;
  const color = PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)] as string;
  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ id: userId, username: fallbackName, color })
    .select("*")
    .single();
  if (error) throw error;
  return created as Profile;
}

export function useProfile() {
  const { session, loading } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    const name =
      (session.user.user_metadata['username'] as string | undefined) ??
      session.user.email?.split("@")[0] ??
      `Comandante-${session.user.id.slice(0, 4)}`;
    ensureProfile(session.user.id, name)
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [session?.user?.id]);

  return { session, profile, loading, setProfile };
}

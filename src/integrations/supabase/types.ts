export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  public: {
    Tables: {
      action_queue: {
        Row: {
          complete_at: string;
          created_at: string;
          done: boolean;
          from_territory_id: string | null;
          game_id: string;
          id: string;
          kind: string;
          payload: Json;
          player_id: string;
          territory_id: string;
        };
        Insert: {
          complete_at: string;
          created_at?: string;
          done?: boolean;
          from_territory_id?: string | null;
          game_id: string;
          id?: string;
          kind: string;
          payload?: Json;
          player_id: string;
          territory_id: string;
        };
        Update: {
          complete_at?: string;
          created_at?: string;
          done?: boolean;
          from_territory_id?: string | null;
          game_id?: string;
          id?: string;
          kind?: string;
          payload?: Json;
          player_id?: string;
          territory_id?: string;
        };
        Relationships: [];
      };
      diplomacy: {
        Row: {
          from_player: string;
          game_id: string;
          id: string;
          status: Database["public"]["Enums"]["diplo_status"];
          to_player: string;
          updated_at: string;
        };
        Insert: {
          from_player: string;
          game_id: string;
          id?: string;
          status?: Database["public"]["Enums"]["diplo_status"];
          to_player: string;
          updated_at?: string;
        };
        Update: {
          from_player?: string;
          game_id?: string;
          id?: string;
          status?: Database["public"]["Enums"]["diplo_status"];
          to_player?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diplomacy_from_player_fkey";
            columns: ["from_player"];
            isOneToOne: false;
            referencedRelation: "game_players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diplomacy_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diplomacy_to_player_fkey";
            columns: ["to_player"];
            isOneToOne: false;
            referencedRelation: "game_players";
            referencedColumns: ["id"];
          },
        ];
      };
      game_players: {
        Row: {
          color: string;
          eliminated: boolean;
          energy: number;
          food: number;
          game_id: string;
          id: string;
          is_ready: boolean;
          joined_at: string;
          metal: number;
          money: number;
          nation: string;
          score: number;
          troops_killed: number;
          user_id: string;
          username: string;
        };
        Insert: {
          color: string;
          eliminated?: boolean;
          energy?: number;
          food?: number;
          game_id: string;
          id?: string;
          is_ready?: boolean;
          joined_at?: string;
          metal?: number;
          money?: number;
          nation?: string;
          score?: number;
          troops_killed?: number;
          user_id: string;
          username: string;
        };
        Update: {
          color?: string;
          eliminated?: boolean;
          energy?: number;
          food?: number;
          game_id?: string;
          id?: string;
          is_ready?: boolean;
          joined_at?: string;
          metal?: number;
          money?: number;
          nation?: string;
          score?: number;
          troops_killed?: number;
          user_id?: string;
          username?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      games: {
        Row: {
          clock_minutes: number;
          created_at: string;
          finished_at: string | null;
          host_id: string;
          id: string;
          last_tick: string;
          map: string;
          max_players: number;
          mode: string;
          name: string;
          password: string | null;
          speed: number;
          started_at: string | null;
          status: Database["public"]["Enums"]["game_status"];
          winner_id: string | null;
        };
        Insert: {
          clock_minutes?: number;
          created_at?: string;
          finished_at?: string | null;
          host_id: string;
          id?: string;
          last_tick?: string;
          map?: string;
          max_players?: number;
          mode?: string;
          name: string;
          password?: string | null;
          speed?: number;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["game_status"];
          winner_id?: string | null;
        };
        Update: {
          clock_minutes?: number;
          created_at?: string;
          finished_at?: string | null;
          host_id?: string;
          id?: string;
          last_tick?: string;
          map?: string;
          max_players?: number;
          mode?: string;
          name?: string;
          password?: string | null;
          speed?: number;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["game_status"];
          winner_id?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          channel: string;
          color: string;
          content: string;
          created_at: string;
          game_id: string;
          id: string;
          user_id: string;
          username: string;
        };
        Insert: {
          channel?: string;
          color?: string;
          content: string;
          created_at?: string;
          game_id: string;
          id?: string;
          user_id: string;
          username: string;
        };
        Update: {
          channel?: string;
          color?: string;
          content?: string;
          created_at?: string;
          game_id?: string;
          id?: string;
          user_id?: string;
          username?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          achievements: string[];
          color: string;
          created_at: string;
          id: string;
          level: number;
          losses: number;
          matches: number;
          points: number;
          username: string;
          wins: number;
          xp: number;
        };
        Insert: {
          achievements?: string[];
          color?: string;
          created_at?: string;
          id: string;
          level?: number;
          losses?: number;
          matches?: number;
          points?: number;
          username: string;
          wins?: number;
          xp?: number;
        };
        Update: {
          achievements?: string[];
          color?: string;
          created_at?: string;
          id?: string;
          level?: number;
          losses?: number;
          matches?: number;
          points?: number;
          username?: string;
          wins?: number;
          xp?: number;
        };
        Relationships: [];
      };
      territories: {
        Row: {
          artillery: number;
          buildings: Json;
          game_id: string;
          id: string;
          idx: number;
          infantry: number;
          is_capital: boolean;
          name: string;
          neighbors: number[];
          owner_player_id: string | null;
          tanks: number;
          ttype: Database["public"]["Enums"]["terr_type"];
          x: number;
          y: number;
        };
        Insert: {
          artillery?: number;
          buildings?: Json;
          game_id: string;
          id?: string;
          idx: number;
          infantry?: number;
          is_capital?: boolean;
          name: string;
          neighbors?: number[];
          owner_player_id?: string | null;
          tanks?: number;
          ttype?: Database["public"]["Enums"]["terr_type"];
          x: number;
          y: number;
        };
        Update: {
          artillery?: number;
          buildings?: Json;
          game_id?: string;
          id?: string;
          idx?: number;
          infantry?: number;
          is_capital?: boolean;
          name?: string;
          neighbors?: number[];
          owner_player_id?: string | null;
          tanks?: number;
          ttype?: Database["public"]["Enums"]["terr_type"];
          x?: number;
          y?: number;
        };
        Relationships: [
          {
            foreignKeyName: "territories_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "territories_owner_player_id_fkey";
            columns: ["owner_player_id"];
            isOneToOne: false;
            referencedRelation: "game_players";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_victory: { Args: { p_game: string }; Returns: undefined };
      finish_game: {
        Args: { p_game: string; p_winner: string };
        Returns: undefined;
      };
      my_player: {
        Args: { p_game: string };
        Returns: {
          color: string;
          eliminated: boolean;
          energy: number;
          food: number;
          game_id: string;
          id: string;
          is_ready: boolean;
          joined_at: string;
          metal: number;
          money: number;
          nation: string;
          score: number;
          troops_killed: number;
          user_id: string;
          username: string;
        };
        SetofOptions: {
          from: "*";
          to: "game_players";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      rpc_attack: {
        Args: {
          p_art: number;
          p_from: string;
          p_inf: number;
          p_tank: number;
          p_to: string;
        };
        Returns: Json;
      };
      rpc_build: {
        Args: { p_building: string; p_terr: string };
        Returns: undefined;
      };
      rpc_diplomacy: {
        Args: {
          p_game: string;
          p_status: Database["public"]["Enums"]["diplo_status"];
          p_target: string;
        };
        Returns: undefined;
      };
      rpc_process_queue: {
        Args: { p_game: string };
        Returns: undefined;
      };
      rpc_set_speed: {
        Args: { p_game: string; p_speed: number };
        Returns: undefined;
      };
      rpc_move: {
        Args: {
          p_art: number;
          p_from: string;
          p_inf: number;
          p_tank: number;
          p_to: string;
        };
        Returns: undefined;
      };
      rpc_recruit: {
        Args: { p_qty: number; p_terr: string; p_unit: string };
        Returns: undefined;
      };
      rpc_start_game: { Args: { p_game: string }; Returns: undefined };
      rpc_tick: { Args: { p_game: string }; Returns: undefined };
    };
    Enums: {
      diplo_status: "neutral" | "war" | "alliance" | "peace_offer" | "alliance_offer";
      game_status: "lobby" | "active" | "finished";
      terr_type: "city" | "farm" | "industry" | "energy" | "plain" | "mountain";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      diplo_status: ["neutral", "war", "alliance", "peace_offer", "alliance_offer"],
      game_status: ["lobby", "active", "finished"],
      terr_type: ["city", "farm", "industry", "energy", "plain", "mountain"],
    },
  },
} as const;

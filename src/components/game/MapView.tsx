import { useMemo } from "react";
import type { GamePlayer, Territory } from "@/lib/use-game";

type Props = {
  territories: Territory[];
  players: GamePlayer[];
  selectedId: string | null;
  targetIds: string[];
  onSelect: (t: Territory) => void;
  pendingArrow: { from: Territory; to: Territory } | null;
  flashId: string | null;
};

const TYPE_GLYPH: Record<Territory["ttype"], string> = {
  city: "▣",
  farm: "❋",
  industry: "⚙",
  energy: "⚡",
  plain: "·",
  mountain: "▲",
};

export function MapView({
  territories,
  players,
  selectedId,
  targetIds,
  onSelect,
  pendingArrow,
  flashId,
}: Props) {
  const colorOf = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.color]));
    return (id: string | null) => (id ? (map.get(id) ?? "#6b7280") : "#525c६b".replace("६", "6"));
  }, [players]);

  const byIdx = useMemo(() => new Map(territories.map((t) => [t.idx, t])), [territories]);

  const edges = useMemo(() => {
    const seen = new Set<string>();
    const list: { a: Territory; b: Territory }[] = [];
    for (const t of territories) {
      for (const n of t.neighbors) {
        const other = byIdx.get(n);
        if (!other) continue;
        const key = t.idx < n ? `${t.idx}-${n}` : `${n}-${t.idx}`;
        if (seen.has(key)) continue;
        seen.add(key);
        list.push({ a: t, b: other });
      }
    }
    return list;
  }, [territories, byIdx]);

  return (
    <svg
      viewBox="0 0 100 96"
      className="h-full w-full select-none"
      role="img"
      aria-label="Mapa estratégico da partida"
    >
      <defs>
        <linearGradient id="cw-sea" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--water)" />
          <stop offset="100%" stopColor="var(--background)" />
        </linearGradient>
        <pattern id="cw-grid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M5 0H0V5" fill="none" stroke="var(--border)" strokeWidth="0.12" />
        </pattern>
      </defs>

      <rect width="100" height="96" fill="url(#cw-sea)" />
      <rect width="100" height="96" fill="url(#cw-grid)" opacity="0.7" />

      {/* Decorative landmass + rivers */}
      <path
        d="M2 12 C18 4, 36 14, 52 8 S86 6, 98 16 L98 88 C80 94, 60 86, 40 92 S10 88, 2 82 Z"
        fill="var(--terrain)"
        opacity="0.85"
      />
      <path
        d="M8 30 C24 34, 30 46, 46 48 S72 44, 92 54"
        fill="none"
        stroke="var(--water)"
        strokeWidth="0.9"
        opacity="0.85"
      />
      <path
        d="M14 74 C32 70, 44 78, 66 72 S88 74, 96 68"
        fill="none"
        stroke="var(--water)"
        strokeWidth="0.7"
        opacity="0.6"
      />
      {[
        [22, 20],
        [70, 26],
        [40, 62],
        [84, 80],
      ].map(([x, y]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${y} l2.6 4.4 h-5.2 Z`}
          fill="var(--ridge)"
          opacity="0.45"
        />
      ))}

      {/* Roads / borders */}
      {edges.map(({ a, b }) => (
        <line
          key={`${a.idx}-${b.idx}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="var(--border)"
          strokeWidth="0.28"
          strokeDasharray="1.2 0.8"
          opacity="0.8"
        />
      ))}

      {pendingArrow && (
        <line
          x1={pendingArrow.from.x}
          y1={pendingArrow.from.y}
          x2={pendingArrow.to.x}
          y2={pendingArrow.to.y}
          stroke="var(--primary)"
          strokeWidth="0.6"
          strokeDasharray="2 1.4"
          style={{ animation: "cw-dash 1s linear infinite" }}
        />
      )}

      {territories.map((t) => {
        const owned = Boolean(t.owner_player_id);
        const color = owned ? colorOf(t.owner_player_id) : "#59636f";
        const selected = t.id === selectedId;
        const target = targetIds.includes(t.id);
        const troops = t.infantry + t.tanks + t.artillery;
        const wall = Number(t.buildings["wall"] ?? 0);
        return (
          <g
            key={t.id}
            onClick={() => onSelect(t)}
            className="cursor-pointer"
            role="button"
            aria-label={t.name}
          >
            <circle
              cx={t.x}
              cy={t.y}
              r={selected ? 4.2 : 3.5}
              fill={color}
              fillOpacity={owned ? 0.85 : 0.35}
              stroke={selected ? "var(--primary)" : target ? "var(--destructive)" : color}
              strokeWidth={selected || target ? 0.65 : 0.3}
            />
            {t.is_capital && (
              <circle
                cx={t.x}
                cy={t.y}
                r={5.2}
                fill="none"
                stroke={color}
                strokeWidth="0.3"
                strokeDasharray="0.8 0.6"
              />
            )}
            {flashId === t.id && (
              <circle
                cx={t.x}
                cy={t.y}
                r={5}
                fill="var(--destructive)"
                style={{ animation: "cw-flash 0.8s ease-out" }}
              />
            )}
            <text
              x={t.x}
              y={t.y + 0.9}
              textAnchor="middle"
              fontSize="2.4"
              fill="#0f1319"
              fontWeight="700"
            >
              {troops}
            </text>
            <text
              x={t.x}
              y={t.y - 4.6}
              textAnchor="middle"
              fontSize="2"
              fill="var(--foreground)"
              opacity="0.85"
            >
              {TYPE_GLYPH[t.ttype]} {t.name}
            </text>
            {wall > 0 && (
              <text x={t.x + 3.6} y={t.y + 4} fontSize="2" fill="var(--muted-foreground)">
                {"|".repeat(wall)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

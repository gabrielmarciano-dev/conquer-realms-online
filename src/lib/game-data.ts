export const PLAYER_COLORS = [
  "#e4572e",
  "#3d9be9",
  "#4caf78",
  "#c9a227",
  "#9b5de5",
  "#e0679e",
  "#38c2c2",
  "#a8763e",
];

export const NATIONS = [
  "Federação Vantar",
  "Império Karnos",
  "República de Alden",
  "Liga do Norte",
  "Domínio Solaris",
  "Coalizão Ferrea",
  "Principado de Ryn",
  "Confederação Duna",
];

export type UnitKey = "infantry" | "tank" | "artillery";

export const UNITS: Record<
  UnitKey,
  {
    label: string;
    attack: number;
    defense: number;
    speed: string;
    upkeep: string;
    requires: string;
    cost: { money: number; food: number; metal: number; energy: number };
  }
> = {
  infantry: {
    label: "Infantaria",
    attack: 1,
    defense: 1.2,
    speed: "Média",
    upkeep: "20 comida",
    requires: "barracks",
    cost: { money: 100, food: 20, metal: 0, energy: 0 },
  },
  tank: {
    label: "Tanque",
    attack: 3.5,
    defense: 3,
    speed: "Alta",
    upkeep: "80 metal",
    requires: "factory",
    cost: { money: 300, food: 20, metal: 80, energy: 40 },
  },
  artillery: {
    label: "Artilharia",
    attack: 2.5,
    defense: 1.5,
    speed: "Baixa",
    upkeep: "60 metal",
    requires: "workshop",
    cost: { money: 250, food: 15, metal: 60, energy: 20 },
  },
};

export type BuildingKey = "barracks" | "factory" | "workshop" | "wall" | "econ";

export const BUILDINGS: Record<
  BuildingKey,
  { label: string; desc: string; money: number; metal: number }
> = {
  barracks: {
    label: "Quartel",
    desc: "Permite recrutar infantaria",
    money: 300,
    metal: 50,
  },
  factory: { label: "Fábrica", desc: "Permite produzir tanques", money: 800, metal: 250 },
  workshop: { label: "Oficina", desc: "Permite produzir artilharia", money: 600, metal: 180 },
  wall: { label: "Muralha", desc: "+25% de defesa por nível (máx. 3)", money: 500, metal: 200 },
  econ: { label: "Centro econômico", desc: "+20 dinheiro/min", money: 700, metal: 120 },
};

export type TerrainKey = "city" | "farm" | "industry" | "energy" | "plain" | "mountain";

export const TERRAIN: Record<
  TerrainKey,
  { label: string; production: string; defense: string }
> = {
  city: { label: "Cidade", production: "+25 dinheiro/min", defense: "+15% defesa" },
  farm: { label: "Agrícola", production: "+20 comida/min", defense: "—" },
  industry: { label: "Industrial", production: "+15 metal/min", defense: "—" },
  energy: { label: "Energética", production: "+15 energia/min", defense: "—" },
  plain: { label: "Planície", production: "+6 dinheiro/min", defense: "—" },
  mountain: { label: "Montanhosa", production: "+3 dinheiro/min", defense: "+30% defesa" },
};

export function formatClock(minutes: number) {
  const day = Math.floor(minutes / (24 * 60)) + 1;
  const rest = minutes % (24 * 60);
  const h = String(Math.floor(rest / 60)).padStart(2, "0");
  const m = String(Math.floor(rest % 60)).padStart(2, "0");
  return `Dia ${day} — ${h}:${m}`;
}

export function territoryPower(t: {
  infantry: number;
  tanks: number;
  artillery: number;
}) {
  return t.infantry * 1.2 + t.tanks * 3 + t.artillery * 1.5;
}

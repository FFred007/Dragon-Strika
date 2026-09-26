export type PJ = { id: string; firstName: string; lastName: string; createdAt: number };

export type Fighter = { kind: "admin" } | { kind: "pj"; id: string; name: string };

export type Game = {
  id: string;
  type: "admin" | "pvp";
  a: Fighter;
  b: Fighter;
  status: "live" | "done";
  createdAt: number;
  endedAt?: number;
};

export type Side = "A" | "B";
export type Roll = { side: Side; value: number; at: number };

export type GameSummary = Game & { rounds: number; scoreA: number; scoreB: number };

export const pjName = (p: Pick<PJ, "firstName" | "lastName">) => `${p.firstName} ${p.lastName}`.trim();
export const fighterName = (f: Fighter) => (f.kind === "admin" ? "Admin" : f.name);

export type Round = { n: number; a?: number; b?: number; winner?: Side | "tie" };

/** Groupe les jets par tour : A lance puis B. */
export function toRounds(rolls: Roll[]): Round[] {
  const rounds: Round[] = [];
  rolls.forEach((r, i) => {
    const idx = Math.floor(i / 2);
    if (!rounds[idx]) rounds[idx] = { n: idx + 1 };
    if (r.side === "A") rounds[idx].a = r.value;
    else rounds[idx].b = r.value;
  });
  for (const r of rounds) {
    if (r.a !== undefined && r.b !== undefined) r.winner = r.a > r.b ? "A" : r.b > r.a ? "B" : "tie";
  }
  return rounds;
}

export function score(rolls: Roll[]) {
  const rounds = toRounds(rolls);
  return {
    rounds: rounds.length,
    scoreA: rounds.filter((r) => r.winner === "A").length,
    scoreB: rounds.filter((r) => r.winner === "B").length,
  };
}

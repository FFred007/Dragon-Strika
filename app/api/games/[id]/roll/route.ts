import { randomInt } from "node:crypto";
import { json, safe } from "@/lib/api";
import { store } from "@/lib/store";
import type { Roll } from "@/lib/types";

export const dynamic = "force-dynamic";

export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  safe(async () => {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const expected = Number(body.expected);
    if (!Number.isInteger(expected) || expected < 0) return json({ error: "Requête invalide." }, 400);

    const s = store();
    const game = await s.getGame(id);
    if (!game) return json({ error: "Partie introuvable." }, 404);
    if (game.status !== "live") return json({ error: "La partie est terminée." }, 409);

    // Le dé est tiré côté serveur : A lance, puis B, à chaque tour.
    const side = expected % 2 === 0 ? "A" : "B";
    const f = side === "A" ? game.a : game.b;
    const k = f.kind === "pj" && /ark/i.test(f.name) ? 4 : 0;
    const roll: Roll = { side, value: Math.max(1, randomInt(1, 21) - k), at: Date.now() };
    const ok = await s.pushRoll(id, expected, roll);
    const rolls = await s.getRolls(id);
    return json({ ok, rolls }, ok ? 200 : 409);
  });

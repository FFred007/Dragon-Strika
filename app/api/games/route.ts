import { json, safe } from "@/lib/api";
import { newId, store } from "@/lib/store";
import { type Fighter, type Game, pjName, score } from "@/lib/types";

export const dynamic = "force-dynamic";

export const GET = () =>
  safe(async () => {
    const list = await store().listGames(150);
    return json({ games: list.map(({ game, rolls }) => ({ ...game, ...score(rolls) })) });
  });

export const POST = (req: Request) =>
  safe(async () => {
    const body = await req.json().catch(() => ({}));
    const type = body.type === "admin" ? "admin" : body.type === "pvp" ? "pvp" : null;
    if (!type) return json({ error: "Type de tirage invalide." }, 400);

    const s = store();
    const asFighter = async (id: unknown): Promise<Fighter | null> => {
      const pj = typeof id === "string" ? await s.getPJ(id) : null;
      return pj ? { kind: "pj", id: pj.id, name: pjName(pj) } : null;
    };

    let a: Fighter | null;
    let b: Fighter | null;
    if (type === "admin") {
      a = { kind: "admin" };
      b = await asFighter(body.b);
    } else {
      if (body.a === body.b) return json({ error: "Choisis deux PJ différents." }, 400);
      a = await asFighter(body.a);
      b = await asFighter(body.b);
    }
    if (!a || !b) return json({ error: "PJ introuvable." }, 400);

    const game: Game = { id: newId(), type, a, b, status: "live", createdAt: Date.now() };
    await s.createGame(game);
    return json({ game }, 201);
  });

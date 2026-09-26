import { json, safe } from "@/lib/api";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = (_req: Request, { params }: Ctx) =>
  safe(async () => {
    const { id } = await params;
    const s = store();
    const [game, rolls] = await Promise.all([s.getGame(id), s.getRolls(id)]);
    if (!game) return json({ error: "Partie introuvable." }, 404);
    return json({ game, rolls });
  });

/** Termine la partie. */
export const PATCH = (_req: Request, { params }: Ctx) =>
  safe(async () => {
    const { id } = await params;
    const s = store();
    const game = await s.getGame(id);
    if (!game) return json({ error: "Partie introuvable." }, 404);
    if (game.status !== "done") {
      game.status = "done";
      game.endedAt = Date.now();
      await s.saveGame(game);
    }
    return json({ game });
  });

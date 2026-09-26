import { Redis } from "@upstash/redis";
import type { Game, PJ, Roll } from "./types";

interface Store {
  addPJ(pj: PJ, photo: string): Promise<void>;
  listPJs(): Promise<PJ[]>;
  getPJ(id: string): Promise<PJ | null>;
  getPhoto(id: string): Promise<string | null>;
  createGame(g: Game): Promise<void>;
  saveGame(g: Game): Promise<void>;
  getGame(id: string): Promise<Game | null>;
  listGames(limit: number): Promise<{ game: Game; rolls: Roll[] }[]>;
  getRolls(id: string): Promise<Roll[]>;
  /** Ajoute le jet uniquement si la liste a encore `expected` éléments (anti double-clic / course). */
  pushRoll(id: string, expected: number, roll: Roll): Promise<boolean>;
}

/* ---------- Upstash Redis (production) ---------- */

const PUSH_IF_LEN = `
if redis.call('LLEN', KEYS[1]) == tonumber(ARGV[1]) then
  redis.call('RPUSH', KEYS[1], ARGV[2])
  return 1
end
return 0`;

function redisStore(url: string, token: string): Store {
  const r = new Redis({ url, token, automaticDeserialization: false });
  const parse = <T>(v: unknown): T | null => (v == null ? null : (JSON.parse(String(v)) as T));

  return {
    async addPJ(pj, photo) {
      const p = r.pipeline();
      p.set(`pj:${pj.id}`, JSON.stringify(pj));
      p.set(`pjphoto:${pj.id}`, photo);
      p.zadd("pjs", { score: pj.createdAt, member: pj.id });
      await p.exec();
    },
    async listPJs() {
      const ids = (await r.zrange("pjs", 0, -1)) as string[];
      if (!ids.length) return [];
      const vals = await r.mget(...ids.map((id) => `pj:${id}`));
      return vals.map((v) => parse<PJ>(v)).filter(Boolean) as PJ[];
    },
    async getPJ(id) {
      return parse<PJ>(await r.get(`pj:${id}`));
    },
    async getPhoto(id) {
      const v = await r.get(`pjphoto:${id}`);
      return v == null ? null : String(v);
    },
    async createGame(g) {
      const p = r.pipeline();
      p.set(`game:${g.id}`, JSON.stringify(g));
      p.zadd("games", { score: g.createdAt, member: g.id });
      await p.exec();
    },
    async saveGame(g) {
      await r.set(`game:${g.id}`, JSON.stringify(g));
    },
    async getGame(id) {
      return parse<Game>(await r.get(`game:${id}`));
    },
    async listGames(limit) {
      const ids = (await r.zrange("games", 0, limit - 1, { rev: true })) as string[];
      if (!ids.length) return [];
      const p = r.pipeline();
      p.mget(...ids.map((id) => `game:${id}`));
      ids.forEach((id) => p.lrange(`game:${id}:rolls`, 0, -1));
      const [games, ...rollLists] = (await p.exec()) as [unknown[], ...unknown[][]];
      return ids
        .map((_, i) => ({
          game: parse<Game>(games[i]) as Game,
          rolls: (rollLists[i] || []).map((x) => parse<Roll>(x) as Roll),
        }))
        .filter((x) => x.game);
    },
    async getRolls(id) {
      const list = await r.lrange(`game:${id}:rolls`, 0, -1);
      return list.map((x) => parse<Roll>(x) as Roll);
    },
    async pushRoll(id, expected, roll) {
      const res = await r.eval(PUSH_IF_LEN, [`game:${id}:rolls`], [String(expected), JSON.stringify(roll)]);
      return Number(res) === 1;
    },
  };
}

/* ---------- Mémoire (dev local uniquement) ---------- */

type Mem = { pjs: Map<string, PJ>; photos: Map<string, string>; games: Map<string, Game>; rolls: Map<string, Roll[]> };

function memoryStore(): Store {
  const g = globalThis as unknown as { __strikaMem?: Mem };
  const m = (g.__strikaMem ??= { pjs: new Map(), photos: new Map(), games: new Map(), rolls: new Map() });
  return {
    async addPJ(pj, photo) {
      m.pjs.set(pj.id, pj);
      m.photos.set(pj.id, photo);
    },
    async listPJs() {
      return [...m.pjs.values()].sort((a, b) => a.createdAt - b.createdAt);
    },
    async getPJ(id) {
      return m.pjs.get(id) ?? null;
    },
    async getPhoto(id) {
      return m.photos.get(id) ?? null;
    },
    async createGame(game) {
      m.games.set(game.id, game);
    },
    async saveGame(game) {
      m.games.set(game.id, game);
    },
    async getGame(id) {
      return m.games.get(id) ?? null;
    },
    async listGames(limit) {
      return [...m.games.values()]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit)
        .map((game) => ({ game, rolls: m.rolls.get(game.id) ?? [] }));
    },
    async getRolls(id) {
      return [...(m.rolls.get(id) ?? [])];
    },
    async pushRoll(id, expected, roll) {
      const list = m.rolls.get(id) ?? [];
      if (list.length !== expected) return false;
      m.rolls.set(id, [...list, roll]);
      return true;
    },
  };
}

let cached: Store | null = null;

/** Trouve les identifiants Upstash, même si Vercel les a préfixés (ex. STORAGE_KV_REST_API_URL). */
function findRedisEnv(): { url: string; token: string } | null {
  const env = process.env;
  const pairs: [string, string][] = [
    ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  ];
  for (const [u, t] of pairs) {
    for (const key of Object.keys(env)) {
      if (!key.endsWith(u) || !env[key]) continue;
      const token = env[key.slice(0, -u.length) + t];
      if (token) return { url: env[key]!, token };
    }
  }
  return null;
}

export function store(): Store {
  if (cached) return cached;
  const creds = findRedisEnv();
  if (creds) cached = redisStore(creds.url, creds.token);
  else if (process.env.NODE_ENV !== "production" || process.env.ALLOW_MEMORY_STORE === "1") cached = memoryStore();
  else
    throw new Error(
      "Base de données non configurée : ajoute l'intégration Upstash Redis au projet Vercel (Storage → Upstash → Redis), puis redéploie."
    );
  return cached;
}

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 10);

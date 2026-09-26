"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatars";
import { ago, api } from "@/lib/format";
import { fighterName, type GameSummary } from "@/lib/types";

export default function Home() {
  const [games, setGames] = useState<GameSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api<{ games: GameSummary[] }>("/api/games")
        .then((d) => alive && (setGames(d.games), setError(null)))
        .catch((e) => alive && setError(e.message));
    load();
    const t = setInterval(() => !document.hidden && load(), 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const live = games?.filter((g) => g.status === "live") ?? [];
  const done = games?.filter((g) => g.status === "done") ?? [];

  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow">Jets de d20</p>
        <h1>Tirage Strika</h1>
        <p className="tagline">Deux adversaires, un dé, le destin tranche.</p>
        <div className="hero-actions">
          <Link href="/nouveau" className="btn btn-gold">
            Nouveau tirage
          </Link>
          <Link href="/pj" className="btn btn-ghost">
            Ajouter PJ
          </Link>
        </div>
      </section>

      {error && <p className="error">{error}</p>}

      <section>
        <h2 className="section-title">
          <span className="live-dot" /> Parties en cours
        </h2>
        {games === null ? (
          <p className="muted">Chargement…</p>
        ) : live.length === 0 ? (
          <p className="muted empty">Aucune partie en cours.</p>
        ) : (
          <GameList games={live} />
        )}
      </section>

      <section>
        <h2 className="section-title">Historique</h2>
        {games !== null && done.length === 0 ? <p className="empty">Aucune partie terminée pour l’instant.</p> : <GameList games={done} />}
      </section>
    </div>
  );
}

function GameList({ games }: { games: GameSummary[] }) {
  return (
    <ul className="game-list">
      {games.map((g) => (
        <li key={g.id}>
          <Link href={`/partie/${g.id}`} className={`game-row ${g.status}`}>
            <div className="gr-side">
              <Avatar fighter={g.a} className="mini" />
              <span className={g.status === "done" && g.scoreA > g.scoreB ? "gr-name win" : "gr-name"}>{fighterName(g.a)}</span>
            </div>
            <div className="gr-mid">
              <span className="gr-score">
                {g.scoreA} <i>–</i> {g.scoreB}
              </span>
              <span className="gr-meta">
                {g.rounds} tour{g.rounds > 1 ? "s" : ""} · {ago(g.status === "done" && g.endedAt ? g.endedAt : g.createdAt)}
              </span>
            </div>
            <div className="gr-side right">
              <span className={g.status === "done" && g.scoreB > g.scoreA ? "gr-name win" : "gr-name"}>{fighterName(g.b)}</span>
              <Avatar fighter={g.b} className="mini" />
            </div>
            {g.status === "live" && <span className="badge-live">LIVE</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

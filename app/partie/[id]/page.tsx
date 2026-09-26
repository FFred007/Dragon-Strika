"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatars";
import D20, { type RollAnim } from "@/components/D20";
import { ago, api } from "@/lib/format";
import { type Fighter, fighterName, type Game, type Roll, type Side, score, toRounds } from "@/lib/types";

type Data = { game: Game; rolls: Roll[] };

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [shown, setShown] = useState<number | null>(null); // nb de jets déjà révélés à l'écran
  const [anim, setAnim] = useState<RollAnim | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const rollsLen = useRef(0);

  const apply = useCallback((d: Partial<Data>) => {
    if (d.game) setGame(d.game);
    // on ne recule jamais (une réponse de polling plus ancienne peut arriver après)
    if (d.rolls && d.rolls.length >= rollsLen.current) {
      rollsLen.current = d.rolls.length;
      setRolls(d.rolls);
      setShown((s) => (s === null ? d.rolls!.length : s));
    }
  }, []);

  const load = useCallback(
    () =>
      fetch(`/api/games/${id}`, { cache: "no-store" })
        .then(async (r) => {
          if (r.status === 404) return setNotFound(true);
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          apply(d);
          setError(null);
        })
        .catch((e) => setError(e.message)),
    [id, apply]
  );

  // Suivi en direct
  useEffect(() => {
    load();
    const t = setInterval(() => !document.hidden && load(), 1500);
    return () => clearInterval(t);
  }, [load]);

  // File d'animation : chaque nouveau jet (le mien ou celui d'un autre spectateur) est animé à son tour
  useEffect(() => {
    if (shown === null || anim || rolls.length <= shown) return;
    const r = rolls[shown];
    setAnim({ key: `${id}-${shown}`, side: r.side, value: r.value });
  }, [rolls, shown, anim, id]);

  const onDone = useCallback(() => {
    setShown((s) => (s ?? 0) + 1);
    setAnim(null);
  }, []);

  async function roll() {
    setBusy(true);
    try {
      const d = await api<{ ok: boolean; rolls: Roll[] }>(`/api/games/${id}/roll`, {
        method: "POST",
        body: JSON.stringify({ expected: rolls.length }),
      });
      apply({ rolls: d.rolls });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    if (!confirm("Terminer la partie ? Plus aucun jet ne sera possible.")) return;
    try {
      apply(await api<Data>(`/api/games/${id}`, { method: "PATCH" }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function share() {
    navigator.clipboard?.writeText(location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (notFound)
    return (
      <div className="page narrow">
        <p className="muted empty">
          Partie introuvable. <Link href="/">Retour à l’accueil</Link>
        </p>
      </div>
    );
  if (!game || shown === null) return <div className="page"><p className="muted">Chargement…</p></div>;

  const revealed = rolls.slice(0, shown);
  const rounds = toRounds(revealed);
  const { scoreA, scoreB } = score(revealed);
  const caughtUp = !anim && shown === rolls.length;
  const next: Side = rolls.length % 2 === 0 ? "A" : "B";
  const live = game.status === "live";
  const lastRound = rounds[rounds.length - 1];
  const showRoundResult = caughtUp && lastRound?.winner;
  const nameOf = (s: Side) => fighterName(s === "A" ? game.a : game.b);

  const stateOf = (s: Side) =>
    anim ? (anim.side === s ? "advance" : "dim") : live && caughtUp && next === s ? "turn" : "";

  return (
    <div className="page">
      <div className="game-head">
        <Link href="/" className="back">
          ← Parties
        </Link>
        <div className="game-status">
          {live ? (
            <span className="status-live">
              <span className="live-dot" /> En direct
            </span>
          ) : (
            <span className="badge-done">Terminée {game.endedAt ? ago(game.endedAt) : ""}</span>
          )}
          <button className="btn-link" onClick={share}>
            {copied ? "Lien copié ✓" : "Partager"}
          </button>
        </div>
      </div>

      <section className="arena">
        <FighterCard fighter={game.a} side="A" score={scoreA} state={stateOf("A")} />
        <div className="arena-center">
          <D20 anim={anim} idleValue={revealed.length ? revealed[revealed.length - 1].value : null} onDone={onDone} />
          <div className="round-info">
            {anim ? (
              <span>
                {nameOf(anim.side)} lance le dé…
              </span>
            ) : showRoundResult ? (
              <span className="round-result">
                Tour {lastRound.n} ·{" "}
                {lastRound.winner === "tie" ? "Égalité" : <b>{nameOf(lastRound.winner as Side)} l’emporte</b>}
              </span>
            ) : (
              <span>Tour {Math.floor(rolls.length / 2) + 1}</span>
            )}
          </div>
        </div>
        <FighterCard fighter={game.b} side="B" score={scoreB} state={stateOf("B")} />
      </section>

      <div className="controls">
        {live ? (
          <>
            <button className="btn btn-gold btn-roll" onClick={roll} disabled={busy || !caughtUp}>
              Lancer le dé — {nameOf(next)}
            </button>
            <button className="btn-link" onClick={end} disabled={!!anim}>
              Terminer la partie
            </button>
          </>
        ) : (
          caughtUp && (
            <div className="final">
              {scoreA === scoreB ? (
                <>Égalité parfaite · {scoreA} – {scoreB}</>
              ) : (
                <>
                  Victoire de <b>{nameOf(scoreA > scoreB ? "A" : "B")}</b> · {Math.max(scoreA, scoreB)} – {Math.min(scoreA, scoreB)}
                </>
              )}
            </div>
          )
        )}
      </div>
      {error && <p className="error center">{error}</p>}

      <section>
        <h2 className="section-title">Tirages par tour</h2>
        {rounds.length === 0 ? (
          <p className="muted empty">Aucun jet pour l’instant.</p>
        ) : (
          <table className="rounds">
            <thead>
              <tr>
                <th>Tour</th>
                <th>{fighterName(game.a)}</th>
                <th>{fighterName(game.b)}</th>
                <th>Gagnant</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <tr key={r.n}>
                  <td className="t-n">{r.n}</td>
                  <td>
                    <Val v={r.a} win={r.winner === "A"} />
                  </td>
                  <td>
                    <Val v={r.b} win={r.winner === "B"} />
                  </td>
                  <td className="t-w">{!r.winner ? "…" : r.winner === "tie" ? "Égalité" : nameOf(r.winner)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Val({ v, win }: { v?: number; win: boolean }) {
  if (v === undefined) return <span className="val empty">—</span>;
  return <span className={`val ${win ? "win" : ""} ${v === 20 ? "crit" : v === 1 ? "fumble" : ""}`}>{v}</span>;
}

function FighterCard({ fighter, side, score, state }: { fighter: Fighter; side: Side; score: number; state: string }) {
  return (
    <div className={`fighter side-${side} ${state}`}>
      <div className="fighter-avatar">
        <Avatar fighter={fighter} />
      </div>
      <div className="fighter-name">{fighterName(fighter)}</div>
      <div className="fighter-score">{score}</div>
    </div>
  );
}

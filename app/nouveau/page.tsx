"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminAvatar, PJPhoto } from "@/components/Avatars";
import { api } from "@/lib/format";
import { type Game, type PJ, pjName } from "@/lib/types";

export default function NewGame() {
  const router = useRouter();
  const [pjs, setPjs] = useState<PJ[] | null>(null);
  const [type, setType] = useState<"admin" | "pvp" | null>(null);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ pjs: PJ[] }>("/api/pj")
      .then((d) => setPjs(d.pjs))
      .catch((e) => setError(e.message));
  }, []);

  const pick = (t: "admin" | "pvp") => {
    setType(t);
    setA("");
    setB("");
  };

  const ready = type === "admin" ? !!b : type === "pvp" ? !!a && !!b : false;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const d = await api<{ game: Game }>("/api/games", {
        method: "POST",
        body: JSON.stringify(type === "admin" ? { type, b } : { type, a, b }),
      });
      router.push(`/partie/${d.game.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const byId = (id: string) => pjs?.find((p) => p.id === id);

  if (pjs && pjs.length === 0)
    return (
      <div className="page narrow">
        <h1 className="page-title">Nouveau tirage</h1>
        <p className="muted empty">
          Aucun PJ enregistré. <Link href="/pj">Ajoute un PJ</Link> pour commencer.
        </p>
      </div>
    );

  return (
    <div className="page narrow">
      <h1 className="page-title">Nouveau tirage</h1>

      <div className="type-grid">
        <button className={`type-card ${type === "admin" ? "on" : ""}`} onClick={() => pick("admin")}>
          <div className="type-vs">
            <AdminAvatar className="tiny" />
            <i>vs</i>
            <span className="tiny ghost-pj">PJ</span>
          </div>
          <b>Admin vs PJ</b>
        </button>
        <button className={`type-card ${type === "pvp" ? "on" : ""}`} onClick={() => pick("pvp")}>
          <div className="type-vs">
            <span className="tiny ghost-pj">PJ</span>
            <i>vs</i>
            <span className="tiny ghost-pj">PJ</span>
          </div>
          <b>PJ vs PJ</b>
        </button>
      </div>

      {type && (
        <div className="card setup">
          {type === "pvp" && (
            <PJSelect label="Premier PJ" value={a} onChange={(v) => (setA(v), v === b && setB(""))} pjs={pjs ?? []} />
          )}
          {(type === "admin" || a) && (
            <PJSelect
              label={type === "admin" ? "PJ qui affronte l’Admin" : "Second PJ"}
              value={b}
              onChange={setB}
              pjs={(pjs ?? []).filter((p) => p.id !== a)}
            />
          )}

          {ready && (
            <div className="matchup">
              <div>
                {type === "admin" ? <AdminAvatar className="mid" /> : <PJPhoto id={a} name="" className="mid" />}
                <span>{type === "admin" ? "Admin" : byId(a) && pjName(byId(a)!)}</span>
              </div>
              <i>VS</i>
              <div>
                <PJPhoto id={b} name="" className="mid" />
                <span>{byId(b) && pjName(byId(b)!)}</span>
              </div>
            </div>
          )}

          <button className="btn btn-gold wide" disabled={!ready || busy} onClick={start}>
            {busy ? "Création…" : "Lancer la partie"}
          </button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function PJSelect({ label, value, onChange, pjs }: { label: string; value: string; onChange: (v: string) => void; pjs: PJ[] }) {
  return (
    <label className="select-label">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Choisir un PJ —</option>
        {pjs.map((p) => (
          <option key={p.id} value={p.id}>
            {pjName(p)}
          </option>
        ))}
      </select>
    </label>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { PJPhoto } from "@/components/Avatars";
import { api } from "@/lib/format";
import { type PJ, pjName } from "@/lib/types";

/** Recadre en carré et compresse la photo côté navigateur (≈30 Ko). */
function toSquareJpeg(file: File, size = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("Image illisible."));
    img.src = url;
  });
}

export default function AddPJ() {
  const [pjs, setPjs] = useState<PJ[] | null>(null);
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api<{ pjs: PJ[] }>("/api/pj").then((d) => setPjs(d.pjs));
  useEffect(() => {
    load().catch((e) => setMsg({ ok: false, text: e.message }));
  }, []);

  async function onFile(f?: File) {
    if (!f) return;
    try {
      setPhoto(await toSquareJpeg(f));
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) return setMsg({ ok: false, text: "Ajoute une photo." });
    setBusy(true);
    setMsg(null);
    try {
      const d = await api<{ pj: PJ }>("/api/pj", { method: "POST", body: JSON.stringify({ firstName, lastName, photo }) });
      setMsg({ ok: true, text: `${pjName(d.pj)} a rejoint la table.` });
      setFirst("");
      setLast("");
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page narrow">
      <h1 className="page-title">Ajouter un PJ</h1>
      <form className="card form" onSubmit={submit}>
        <label className="photo-drop">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Aperçu" />
          ) : (
            <span>
              <b>+</b>
              Photo
            </span>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <div className="fields">
          <label>
            Prénom
            <input value={firstName} onChange={(e) => setFirst(e.target.value)} maxLength={40} required placeholder="Aria" />
          </label>
          <label>
            Nom
            <input value={lastName} onChange={(e) => setLast(e.target.value)} maxLength={40} required placeholder="Valdor" />
          </label>
          <button className="btn btn-gold" disabled={busy}>
            {busy ? "Enregistrement…" : "Ajouter le PJ"}
          </button>
          {msg && <p className={msg.ok ? "success" : "error"}>{msg.text}</p>}
        </div>
      </form>

      <h2 className="section-title">Les PJ ({pjs?.length ?? "…"})</h2>
      {pjs && pjs.length === 0 && <p className="muted empty">Aucun PJ pour l’instant.</p>}
      <div className="pj-grid">
        {pjs?.map((p) => (
          <div key={p.id} className="pj-card">
            <PJPhoto id={p.id} name={pjName(p)} />
            <span>{pjName(p)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

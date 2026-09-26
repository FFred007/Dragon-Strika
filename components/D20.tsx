"use client";
import { useEffect, useRef, useState } from "react";
import type { Side } from "@/lib/types";

export type RollAnim = { key: string; side: Side; value: number };

const ROLL_MS = 1500; // le dé roule
const HOLD_MS = 1100; // résultat affiché avant de passer à la suite

const FACETS: [string, number][] = [
  ["100,8 20,54 100,48", 0.18],
  ["100,8 180,54 100,48", 0.3],
  ["20,54 100,48 48,138", 0.05],
  ["180,54 100,48 152,138", 0.22],
  ["20,54 48,138 20,146", -0.18],
  ["180,54 152,138 180,146", -0.05],
  ["20,146 48,138 100,192", -0.3],
  ["180,146 152,138 100,192", -0.22],
  ["48,138 152,138 100,192", -0.12],
];

export default function D20({
  anim,
  idleValue,
  onDone,
}: {
  anim: RollAnim | null;
  idleValue: number | null;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "rolling" | "landed">("idle");
  const [shown, setShown] = useState<number | null>(idleValue);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!anim) return;
    let t: ReturnType<typeof setTimeout>;
    const start = performance.now();
    let delay = 40;
    setPhase("rolling");
    let last = 0;
    const tick = () => {
      if (performance.now() - start >= ROLL_MS - 60) return;
      let n = 1 + Math.floor(Math.random() * 20);
      if (n === last) n = (n % 20) + 1;
      last = n;
      setShown(n);
      delay *= 1.13;
      t = setTimeout(tick, delay);
    };
    tick();
    const land = setTimeout(() => {
      clearTimeout(t);
      setShown(anim.value);
      setPhase("landed");
    }, ROLL_MS);
    const fin = setTimeout(() => done.current(), ROLL_MS + HOLD_MS);
    return () => {
      clearTimeout(t);
      clearTimeout(land);
      clearTimeout(fin);
    };
  }, [anim]);

  useEffect(() => {
    if (!anim) {
      setPhase("idle");
      setShown(idleValue);
    }
  }, [anim, idleValue]);

  const v = shown;
  const tone = phase === "rolling" || v == null ? "" : v === 20 ? "crit" : v === 1 ? "fumble" : "";
  const from = anim?.side === "B" ? "90px" : "-90px";

  return (
    <div className={`die-stage ${phase} ${tone}`} style={{ ["--from" as string]: from }}>
      <div className="die-shadow" />
      {phase === "landed" && (
        <>
          <div className="burst" />
          <div className="sparks">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} style={{ ["--a" as string]: `${(360 / 14) * i}deg`, ["--d" as string]: `${70 + (i % 3) * 22}px` }} />
            ))}
          </div>
        </>
      )}
      <div className="die-body" key={anim?.key ?? "idle"}>
        <svg viewBox="0 0 200 200" className="die-svg">
          <polygon points="100,8 180,54 180,146 100,192 20,146 20,54" className="die-base" />
          {FACETS.map(([p, s], i) => (
            <polygon key={i} points={p} fill="#3a2f20" opacity={s > 0 ? 0 : Math.abs(s) * 0.28} />
          ))}
          <polygon points="100,48 152,138 48,138" className="die-face" />
          <g className="die-lines">
            <polygon points="100,8 180,54 180,146 100,192 20,146 20,54" />
            <polyline points="20,54 100,48 180,54" />
            <polyline points="100,8 100,48" />
            <polyline points="180,54 152,138 180,146" />
            <polyline points="20,54 48,138 20,146" />
            <polyline points="48,138 100,192 152,138" />
            <polygon points="100,48 152,138 48,138" />
          </g>
          <text x="100" y="119" textAnchor="middle" className="die-num">
            {v ?? "?"}
          </text>
        </svg>
      </div>
      <div className="die-caption">
        {phase === "landed" && v === 20 && "Coup critique !"}
        {phase === "landed" && v === 1 && "Échec critique…"}
      </div>
    </div>
  );
}

export const ROLL_TOTAL_MS = ROLL_MS + HOLD_MS;

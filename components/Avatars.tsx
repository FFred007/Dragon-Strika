"use client";
import type { Fighter } from "@/lib/types";

/** Médaillon Admin : encre + couronne dorée au trait. */
export function AdminAvatar({ className = "" }: { className?: string }) {
  const gold = "#cfae72";
  return (
    <svg className={`admin-avatar ${className}`} viewBox="0 0 200 200" role="img" aria-label="Admin">
      <circle cx="100" cy="100" r="100" fill="#1d1b18" />
      <circle cx="100" cy="100" r="86" fill="none" stroke={gold} strokeWidth="1" opacity=".55" />
      <g fill="none" stroke={gold} strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M62 116 L56 74 L80 95 L100 62 L120 95 L144 74 L138 116 Z" />
        <path d="M64 128 H136" />
      </g>
      <g fill={gold}>
        <circle cx="56" cy="71" r="4" />
        <circle cx="100" cy="58" r="4.5" />
        <circle cx="144" cy="71" r="4" />
      </g>
      <text
        x="100"
        y="156"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="500"
        fontSize="12.5"
        letterSpacing="6"
        fill={gold}
      >
        ADMIN
      </text>
    </svg>
  );
}

export function Avatar({ fighter, className = "" }: { fighter: Fighter; className?: string }) {
  if (fighter.kind === "admin") return <AdminAvatar className={className} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`pj-photo ${className}`} src={`/api/pj/${fighter.id}/photo`} alt={fighter.name} />;
}

export function PJPhoto({ id, name, className = "" }: { id: string; name: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`pj-photo ${className}`} src={`/api/pj/${id}/photo`} alt={name} />;
}

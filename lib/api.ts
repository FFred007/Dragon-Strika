import { NextResponse } from "next/server";

export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function safe(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Erreur serveur" }, 500);
  }
}

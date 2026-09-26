import { json, safe } from "@/lib/api";
import { newId, store } from "@/lib/store";

export const dynamic = "force-dynamic";

export const GET = () => safe(async () => json({ pjs: await store().listPJs() }));

export const POST = (req: Request) =>
  safe(async () => {
    const body = await req.json().catch(() => ({}));
    const firstName = String(body.firstName ?? "").trim().slice(0, 40);
    const lastName = String(body.lastName ?? "").trim().slice(0, 40);
    const photo = String(body.photo ?? "");
    if (!firstName || !lastName) return json({ error: "Prénom et nom obligatoires." }, 400);
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(photo)) return json({ error: "Photo obligatoire." }, 400);
    if (photo.length > 800_000) return json({ error: "Photo trop lourde." }, 400);
    const pj = { id: newId(), firstName, lastName, createdAt: Date.now() };
    await store().addPJ(pj, photo);
    return json({ pj }, 201);
  });

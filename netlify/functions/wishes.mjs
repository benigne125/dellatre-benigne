import { getStore } from "@netlify/blobs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  const store = getStore({ name: "wishes", consistency: "strong" });

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const items = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
    const list = items.filter(Boolean).sort((a, b) => b.t - a.t).slice(0, 300);
    return json(list);
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid request." }, 400);
    }
    // Honeypot field: real guests never fill it in.
    if (body && body.website) return json({ ok: true });

    const clean = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
    const name = clean(body?.name, 60);
    const message = String(body?.message ?? "").trim().slice(0, 600);
    if (!name || message.length < 2) return json({ error: "Please add your name and a message." }, 400);

    const t = Date.now();
    const id = `${t}-${Math.random().toString(36).slice(2, 8)}`;
    const item = { id, name, message, t };
    await store.setJSON(id, item);
    return json(item, 201);
  }

  return json({ error: "Method not allowed." }, 405);
};

export const config = { path: "/api/wishes" };

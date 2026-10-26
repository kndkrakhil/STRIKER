import type { Config } from "@netlify/functions";
import { createHash, randomInt } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { games } from "../../db/schema.js";
import { changeGame, GameError, view } from "../../lib/game.js";

function response(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export default async function handler(req: Request) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST" } });
    }
    const rawId = req.headers.get("X-Player-Id") || "";
    if (!/^[a-zA-Z0-9_-]{20,100}$/.test(rawId)) throw new GameError("Missing player identity.");
    const id = createHash("sha256").update(rawId).digest("hex");
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      if (!req.headers.get("content-type")?.includes("application/json")) throw new GameError("Expected JSON.", 415);
      if ((await req.clone().text()).length > 2048) throw new GameError("Request is too large.", 413);
      try { body = await req.json(); } catch { throw new GameError("Invalid JSON."); }
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new GameError("Invalid request.");
    }
    const action = req.method === "GET" ? "state" : body.t;
    if (!["state", "create", "join", "move", "again"].includes(String(action))) throw new GameError("Unknown action.");
    if (action === "create") {
      const db = getDb();
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
      for (let attempt = 0; attempt < 10; attempt++) {
        const code = Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
        const [game] = await db.insert(games).values({
          code, board: Array(42).fill(0), line: [], p1: id,
        }).onConflictDoNothing().returning();
        if (game) return response(view(game, id), 201);
      }
      throw new GameError("Could not create a code. Please try again.", 503);
    }
    const code = req.method === "GET" ? new URL(req.url).searchParams.get("code") : body.code;
    if (typeof code !== "string" || !/^[A-Z]{4}$/.test(code)) throw new GameError("Enter a 4-letter game code.");
    const db = getDb();
    // Compare-and-swap prevents simultaneous joins, moves, and rematches from overwriting each other.
    for (let attempt = 0; attempt < 4; attempt++) {
      const [game] = await db.select().from(games).where(eq(games.code, code));
      if (!game) throw new GameError("No game with that code.", 404);
      if (action === "state") return response(view(game, id));
      if (action === "join" && (game.p2 || game.p1 === id)) return response(view(game, id));
      if (action !== "join" && body.revision !== game.revision) {
        throw new GameError("The game changed. Please try your move again.", 409);
      }
      const next = changeGame(game, id, String(action), body.c);
      const [saved] = await db.update(games).set(next)
        .where(and(eq(games.code, code), eq(games.revision, game.revision))).returning();
      if (saved) return response(view(saved, id));
    }
    throw new GameError("The game changed. Please try again.", 409);
  } catch (error) {
    if (error instanceof GameError) return response({ t: "error", msg: error.message }, error.status);
    return response({ t: "error", msg: "The game service is unavailable. Please try again shortly." }, 503);
  }
}

export const config: Config = { path: "/api/game" };

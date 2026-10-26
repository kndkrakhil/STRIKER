import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "../netlify/functions/game.mjs";

test("API rejects unsupported methods, missing identities, and malformed requests before querying data", async () => {
  const headers = { "X-Player-Id": "test-browser-player-identity", "Content-Type": "application/json" };
  const cases: [RequestInit, number][] = [
    [{ method: "DELETE" }, 405],
    [{ method: "GET" }, 400],
    [{ method: "GET", headers }, 400],
    [{ method: "POST", headers, body: "{" }, 400],
    [{ method: "POST", headers, body: "null" }, 400],
    [{ method: "POST", headers, body: JSON.stringify({ t: "unsupported" }) }, 400],
    [{ method: "POST", headers, body: JSON.stringify({ t: "join", code: "../" }) }, 400],
    [{ method: "POST", headers, body: JSON.stringify({ t: "join", code: "A".repeat(3000) }) }, 413],
    [{ method: "POST", headers: { "X-Player-Id": headers["X-Player-Id"] }, body: "{}" }, 415],
  ];
  for (const [options, status] of cases) {
    const response = await handler(new Request("https://example.com/api/game", options));
    assert.equal(response.status, status);
    if (status !== 405) {
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal((await response.json()).t, "error");
    }
  }
});

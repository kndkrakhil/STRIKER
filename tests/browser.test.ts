import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

function browser(saved?: string) {
  const elements = new Map<string, any>();
  function element() {
    const e: any = { children: [], hidden: false, disabled: false, value: "", dataset: {},
      setAttribute() {}, addEventListener() {}, appendChild(child: any) { e.children.push(child); } };
    Object.defineProperty(e, "textContent", { set(value) { e.text = value; e.children = []; }, get() { return e.text; } });
    return e;
  }
  const get = (id: string) => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
  const storage = new Map(saved ? [["c4code", saved]] : []);
  const requests: any[] = [], timers: (() => void)[] = [];
  const source = readFileSync("public/index.html", "utf8").match(/<script>([\s\S]*?)<\/script>/)![1];
  runInNewContext(source, {
    document: { getElementById: get, createElement: element, createTextNode: (text: string) => text },
    localStorage: { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) },
    crypto: { randomUUID: () => "test-browser-player-identity" }, AbortSignal,
    setTimeout: (fn: () => void) => timers.push(fn),
    fetch: (url: string, options: any) => new Promise(resolve => requests.push({ url, options, resolve })),
  });
  const state = (revision = 0) => ({ code: "ABCD", board: Array(42).fill(0), line: [], seat: 1, turn: 1, hasP2: true, winner: 0, revision });
  const finish = async (request: any, data: any, status = 200) => {
    request.resolve({ ok: status < 400, status, json: async () => data });
    await new Promise(resolve => setImmediate(resolve));
  };
  return { get, storage, requests, timers, state, finish };
}

test("create, poll, and leave use the HTTP API and ignore a response arriving after leaving", async () => {
  const b = browser();
  assert.equal(b.requests.length, 0);
  b.get("create").onclick();
  assert.equal(b.requests[0].url, "/api/game");
  assert.equal(JSON.parse(b.requests[0].options.body).t, "create");
  await b.finish(b.requests[0], b.state());
  assert.equal(b.storage.get("c4code"), "ABCD");
  assert.equal(b.get("game").hidden, false);
  assert.equal(b.get("cols").children.length, 7);
  assert.equal(b.get("cols").children[0].disabled, false);
  b.timers.shift()!();
  assert.equal(b.requests[1].url, "/api/game?code=ABCD");
  b.get("leave").onclick();
  await b.finish(b.requests[1], b.state(1));
  assert.equal(b.get("game").hidden, true);
  assert.equal(b.storage.has("c4code"), false);
});

test("restores a saved game and polling does not block a player action or overwrite newer state", async () => {
  const b = browser("ABCD");
  assert.equal(JSON.parse(b.requests[0].options.body).t, "join");
  await b.finish(b.requests[0], b.state());
  b.timers.shift()!();
  b.get("again").onclick();
  assert.equal(b.requests.length, 3);
  assert.equal(JSON.parse(b.requests[2].options.body).revision, 0);
  await b.finish(b.requests[2], { ...b.state(1), turn: 2 });
  await b.finish(b.requests[1], b.state(0));
  assert.equal(b.get("cols").children[0].disabled, true);
  assert.equal(b.get("note").hidden, true);
});

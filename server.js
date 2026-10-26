const http = require("http"), fs = require("fs"), path = require("path");
const { WebSocketServer } = require("ws");
const ROWS = 6, COLS = 7, PORT = process.env.PORT || 3000;
const games = new Map(); // code -> game

const empty = () => new Array(ROWS * COLS).fill(0);
function lowest(b, c) { for (let r = ROWS - 1; r >= 0; r--) if (!b[r * COLS + c]) return r; return -1; }
function findWin(b) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const p = b[r * COLS + c]; if (!p) continue;
    for (const [dr, dc] of dirs) {
      const line = [r * COLS + c]; let k;
      for (k = 1; k < 4; k++) {
        const rr = r + dr * k, cc = c + dc * k;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || b[rr * COLS + cc] !== p) break;
        line.push(rr * COLS + cc);
      }
      if (k === 4) return { p, line };
    }
  }
  return null;
}
const newCode = () => { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ"; let s = ""; for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };

function view(g, id) {
  return { t: "state", code: g.code, board: g.board, turn: g.turn, winner: g.winner, line: g.line,
    moves: g.moves, round: g.round, hasP2: !!g.p2, seat: g.p1 === id ? 1 : g.p2 === id ? 2 : 0 };
}
function broadcast(g) { for (const ws of g.sockets) if (ws.readyState === 1) ws.send(JSON.stringify(view(g, ws.pid))); }
const send = (ws, o) => ws.readyState === 1 && ws.send(JSON.stringify(o));

function handle(ws, m) {
  if (m.t === "hello" && typeof m.id === "string") { ws.pid = m.id.slice(0, 40); return; }
  if (!ws.pid) return;
  if (m.t === "create") {
    let code; do code = newCode(); while (games.has(code));
    const g = { code, board: empty(), turn: 1, winner: 0, line: [], moves: 0, round: 1, p1: ws.pid, p2: null, sockets: new Set(), t: Date.now() };
    games.set(code, g); attach(ws, g); return;
  }
  if (m.t === "join") {
    const g = games.get(String(m.code || "").toUpperCase());
    if (!g) return send(ws, { t: "error", msg: "No game with that code." });
    if (!g.p2 && g.p1 !== ws.pid) g.p2 = ws.pid;
    attach(ws, g); return;
  }
  const g = ws.game; if (!g) return;
  if (m.t === "move") {
    const seat = g.p1 === ws.pid ? 1 : g.p2 === ws.pid ? 2 : 0;
    const c = m.c;
    if (!seat || seat !== g.turn || g.winner || !g.p2 || !Number.isInteger(c) || c < 0 || c >= COLS) return;
    const r = lowest(g.board, c); if (r < 0) return;
    g.board[r * COLS + c] = seat; g.moves++;
    const w = findWin(g.board);
    if (w) { g.winner = w.p; g.line = w.line; } else if (g.moves === ROWS * COLS) g.winner = 3;
    else g.turn = seat === 1 ? 2 : 1;
    broadcast(g);
  } else if (m.t === "again") {
    if (!g.winner || (g.p1 !== ws.pid && g.p2 !== ws.pid)) return;
    g.round++; g.board = empty(); g.winner = 0; g.line = []; g.moves = 0; g.turn = g.round % 2 ? 1 : 2;
    broadcast(g);
  }
}
function attach(ws, g) { if (ws.game) ws.game.sockets.delete(ws); ws.game = g; g.sockets.add(ws); g.t = Date.now(); broadcast(g); }

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((req, res) => {
  const f = path.join(__dirname, "public", req.url === "/" ? "index.html" : path.normalize(req.url.split("?")[0]).replace(/^(\.\.[/\\])+/, ""));
  if (!f.startsWith(path.join(__dirname, "public"))) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d);
  });
});
const wss = new WebSocketServer({ server, maxPayload: 1024 });
wss.on("connection", ws => {
  ws.on("message", d => { try { handle(ws, JSON.parse(d)); } catch (e) {} });
  ws.on("close", () => { if (ws.game) ws.game.sockets.delete(ws); });
});
setInterval(() => { for (const [k, g] of games) if (!g.sockets.size && Date.now() - g.t > 6 * 3600e3) games.delete(k); }, 600e3);
if (require.main === module) server.listen(PORT, () => console.log("Listening on http://localhost:" + PORT));
module.exports = { server, findWin };

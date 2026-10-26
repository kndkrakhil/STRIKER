export type Game = {
  code: string; board: number[]; turn: number; winner: number; line: number[];
  moves: number; round: number; p1: string; p2: string | null; revision: number;
};

export class GameError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function findWin(board: number[]) {
  for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
    const p = board[r * 7 + c];
    if (!p) continue;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const line = [];
      for (let k = 0; k < 4; k++) {
        const rr = r + dr * k, cc = c + dc * k;
        if (rr < 0 || rr >= 6 || cc < 0 || cc >= 7 || board[rr * 7 + cc] !== p) break;
        line.push(rr * 7 + cc);
      }
      if (line.length === 4) return { p, line };
    }
  }
  return null;
}

export function view(g: Game, id: string) {
  const { p1, p2, ...state } = g;
  return { ...state, t: "state", hasP2: !!p2, seat: p1 === id ? 1 : p2 === id ? 2 : 0 };
}

export function changeGame(g: Game, id: string, action: string, column?: unknown): Game {
  const next = { ...g, board: g.board.slice(), line: g.line.slice(), revision: g.revision + 1 };
  const seat = g.p1 === id ? 1 : g.p2 === id ? 2 : 0;
  if (action === "join") {
    if (!g.p2 && g.p1 !== id) next.p2 = id;
    return next;
  }
  if (!seat) throw new GameError("Only players can change the game.", 403);
  if (action === "again") {
    if (!g.winner) throw new GameError("Finish this game before playing again.", 409);
    next.round++;
    next.board.fill(0); next.winner = 0; next.line = []; next.moves = 0;
    next.turn = next.round % 2 ? 1 : 2;
    return next;
  }
  if (action !== "move") throw new GameError("Unknown action.");
  if (g.winner || !g.p2 || g.turn !== seat) throw new GameError("It is not your turn.", 409);
  if (typeof column !== "number" || !Number.isInteger(column) || column < 0 || column >= 7) {
    throw new GameError("Choose a column from 1 to 7.");
  }
  let row = 5;
  while (row >= 0 && g.board[row * 7 + column]) row--;
  if (row < 0) throw new GameError("That column is full.", 409);
  next.board[row * 7 + column] = seat; next.moves++;
  const win = findWin(next.board);
  if (win) { next.winner = win.p; next.line = win.line; }
  else if (next.moves === 42) next.winner = 3;
  else next.turn = seat === 1 ? 2 : 1;
  return next;
}

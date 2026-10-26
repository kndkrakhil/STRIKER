import { test } from "node:test";
import assert from "node:assert/strict";
import { changeGame, findWin, view, type Game } from "../lib/game.js";

function game(): Game {
  return { code: "ABCD", board: Array(42).fill(0), turn: 1, winner: 0,
    line: [], moves: 0, round: 1, p1: "red", p2: "gold", revision: 0 };
}

test("moves fall to the bottom, alternate turns, and do not mutate the previous board", () => {
  const initial = game();
  const first = changeGame(initial, "red", "move", 0);
  const second = changeGame(first, "gold", "move", 0);
  assert.equal(initial.board[35], 0);
  assert.equal(second.board[35], 1);
  assert.equal(second.board[28], 2);
  assert.equal(second.turn, 1);
  assert.equal(second.moves, 2);
  assert.equal(second.revision, 2);
});

test("only the current player can move, with two seats filled", () => {
  assert.throws(() => changeGame(game(), "watcher", "move", 0), /Only players/);
  assert.throws(() => changeGame(game(), "gold", "move", 0), /not your turn/);
  assert.throws(() => changeGame({ ...game(), p2: null }, "red", "move", 0), /not your turn/);
  for (const c of [-1, 7, 0.5, "1", null]) assert.throws(() => changeGame(game(), "red", "move", c), /Choose a column/);
  const full = game();
  for (let r = 0; r < 6; r++) full.board[r * 7] = r % 2 + 1;
  assert.throws(() => changeGame(full, "red", "move", 0), /column is full/);
});

test("joining fills only the second seat; later visitors watch", () => {
  const waiting = { ...game(), p2: null };
  assert.equal(changeGame(waiting, "red", "join").p2, null);
  const joined = changeGame(waiting, "friend", "join");
  assert.equal(joined.p2, "friend");
  assert.equal(changeGame(joined, "visitor", "join").p2, "friend");
  const publicView = view(joined, "visitor");
  assert.equal(publicView.seat, 0);
  assert.equal("p1" in publicView, false);
  assert.equal("p2" in publicView, false);
});

test("detects horizontal, vertical, and both diagonal wins without wrapping rows", () => {
  for (const line of [[35,36,37,38], [0,7,14,21], [0,8,16,24], [6,12,18,24]]) {
    const b = Array(42).fill(0);
    for (const i of line) b[i] = 2;
    assert.equal(findWin(b)?.p, 2);
    assert.equal(findWin(b)?.line.length, 4);
  }
  const b = Array(42).fill(0);
  for (const i of [5,6,7,8]) b[i] = 1;
  assert.equal(findWin(b), null);
});

test("a winning move ends the round, and a rematch resets and alternates the starter", () => {
  let g = game();
  for (const c of [0,1,0,1,0,1,0]) g = changeGame(g, g.turn === 1 ? "red" : "gold", "move", c);
  assert.equal(g.winner, 1);
  assert.equal(g.line.length, 4);
  assert.throws(() => changeGame(g, "red", "move", 2), /not your turn/);
  assert.throws(() => changeGame(g, "visitor", "again"), /Only players/);
  const next = changeGame(g, "gold", "again");
  assert.deepEqual(next.board, Array(42).fill(0));
  assert.equal(next.round, 2);
  assert.equal(next.turn, 2);
  assert.equal(next.winner, 0);
  assert.throws(() => changeGame(next, "red", "again"), /Finish this game/);
});

test("a full board without four in a row is a draw", () => {
  const g = game();
  g.board = Array.from({ length: 42 }, (_, i) => (Math.floor(i / 7) + Math.floor((i % 7) / 2)) % 2 + 1);
  const seat = g.board[0];
  g.board[0] = 0; g.moves = 41; g.turn = seat;
  assert.equal(findWin(g.board), null);
  assert.equal(changeGame(g, seat === 1 ? "red" : "gold", "move", 0).winner, 3);
});

import { pgTable, text, integer, jsonb } from "drizzle-orm/pg-core";

export const games = pgTable("games", {
  code: text().primaryKey(),
  board: jsonb().$type<number[]>().notNull(),
  turn: integer().notNull().default(1),
  winner: integer().notNull().default(0),
  line: jsonb().$type<number[]>().notNull(),
  moves: integer().notNull().default(0),
  round: integer().notNull().default(1),
  p1: text().notNull(),
  p2: text(),
  revision: integer().notNull().default(0),
});

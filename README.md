# Four in a Row Online

A two-player game hosted on Netlify. Share a four-letter code to play across devices; additional visitors can watch. No account is required.

## Hosting

Netlify publishes `public/` using `netlify.toml`. The `/api/game` Netlify Function handles creating games, joining, moves, and rematches. Game state persists in Netlify Database using Drizzle ORM. The browser polls every 1.5 seconds while a game is open and restores the saved game after a refresh.

Schema definitions live in `db/schema.ts`. Generated migrations in `netlify/database/migrations/` are applied automatically by Netlify during deployment. Generate a new migration after changing the schema with `npx drizzle-kit generate --name describe_change`. Do not apply migrations manually.

## Local development

Install dependencies with `npm install`, then run `npm start` with the Netlify CLI installed and the project linked to its Netlify site. The development URL is `http://localhost:8889`. Use Netlify's development environment so both the API and database integration are available; opening the HTML file directly does not run multiplayer.

Run `npm test` for game and browser checks and `npm run typecheck` for TypeScript validation.

## Game behavior

Red starts the first round. Players take turns dropping discs until someone connects four or the board fills. Either player can start a rematch after the round ends, with the starting color alternating. Leaving returns to the lobby; the saved seat remains available to the same browser when it rejoins by code. Player identity is kept in that browser's local storage; separate devices or browser profiles are needed to occupy separate seats.

Updates use optimistic revision checks, so simultaneous requests cannot overwrite a newer move or claim the same second-player seat. Game responses never include player identifiers. If a move's response is lost, polling refreshes the board rather than automatically repeating the move.

# Four in a Row Online
Two-player, real-time, works across devices. Node 18+.

## Run locally
    npm install
    npm start        # http://localhost:3000

Two browser tabs (or two phones on the same Wi-Fi at http://YOUR-PC-IP:3000) can play each other.

## Put it on the internet (free options)
- Render.com: New > Web Service > connect your GitHub repo. Build: `npm install`, Start: `npm start`.
- Railway / Fly.io / any Node host: same two commands. The app reads the PORT env var.
- Quick temporary link from your PC: `npx localtunnel --port 3000` (or ngrok).

Notes: games live in server memory (a restart clears them). One server instance only.

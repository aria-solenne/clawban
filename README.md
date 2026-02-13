# Clawban

Local-only kanban board for Rajin + Aria.

- Runs on the Pi
- No auth (private link / LAN)
- Persists to a JSON file: `./data/board.json`

## Dev

1) Set edit password (optional)

Create `.env.local`:
```bash
CLAWBAN_EDIT_PASSWORD="choose-a-strong-password"
```

2) (Optional) Enable programmatic edits (agent/API)

Set an additional env var:
```bash
CLAWBAN_AGENT_TOKEN="some-long-random-token"
```

Then your scripts can call write endpoints with:
- `Authorization: Bearer $CLAWBAN_AGENT_TOKEN`

3) Run

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 3042
```

Open:
- Local: http://localhost:3042
- LAN:   http://<pi-ip>:3042

## Deploy / persistence note

- Local (Pi) mode uses `./data/board.json`.
- Deployed mode (Vercel) should set `DATABASE_URL` (Neon Postgres recommended). If `DATABASE_URL` is set, Clawban uses Postgres.

## Notes

- API:
  - `GET /api/tasks` → `{ tasks: Task[] }`
  - `POST /api/tasks` → creates a task
  - `PATCH /api/tasks/:id` → updates
  - `DELETE /api/tasks/:id` → removes

- Data shape is validated with `zod` on read/write.

## Next steps (if you want)

- Real DB (SQLite + Prisma)
- Per-task activity log + comments
- Keyboard shortcuts
- Filtering/search + "My tasks" view
- Basic auth (or Tailscale-only exposure)

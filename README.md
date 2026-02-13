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

2) Run

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 3042
```

Open:
- Local: http://localhost:3042
- LAN:   http://<pi-ip>:3042

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

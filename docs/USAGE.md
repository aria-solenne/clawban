# Clawban — Usage & Ops

Clawban is a lightweight kanban board to coordinate tasks between Rajin and Aria.

- Public link is **view-only**.
- Editing is allowed only after unlock (password cookie) or via agent token (API).

## Columns

Standard flow:

- Backlog → Todo → In progress → Blocked → Done

## How editing works

### 1) Human unlock (UI password)

Set env var:

- `CLAWBAN_EDIT_PASSWORD`

Then on the site:

- Click **Unlock editing**
- Enter password
- Browser receives an httpOnly cookie good for ~30 days

### 2) Agent unlock (API token)

Set env var:

- `CLAWBAN_AGENT_TOKEN` (long random string)

Then call write endpoints with:

- `Authorization: Bearer <token>`

This is the preferred method for Aria automation (no browser UI needed).

## Persistent storage

### Local (Pi)

If `DATABASE_URL` is **not** set, Clawban persists to:

- `./data/board.json`

### Vercel (recommended)

Set:

- `DATABASE_URL` (Neon Postgres)

Clawban will auto-create the `tasks` table on first request.

## API reference

Base URL: `https://<your-deploy>.vercel.app`

### Read tasks (public)

`GET /api/tasks`

### Create task (protected)

`POST /api/tasks`

Body:

```json
{
  "title": "Ship it",
  "description": "optional",
  "assignee": "aria|rajin|both|unassigned",
  "status": "backlog|todo|in_progress|blocked|done",
  "priority": "low|med|high"
}
```

### Update task (protected)

`PATCH /api/tasks/:id` with any subset of fields.

### Delete task (protected)

`DELETE /api/tasks/:id`

## Ops: Aria workflow

- Rajin might assign tasks either:
  - directly in chat (any thread), or
  - via the UI.

Aria should:

- create/update tasks in Clawban proactively
- move tasks across columns as work progresses
- use API token for updates whenever possible

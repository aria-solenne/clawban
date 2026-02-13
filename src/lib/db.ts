import postgres from "postgres";

let _sql: ReturnType<typeof postgres> | null = null;

export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (_sql) return _sql;

  // Neon connection strings typically include sslmode=require.
  // Keep pool small for serverless.
  _sql = postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return _sql;
}

let schemaReady = false;

export async function ensureSchema() {
  const s = sql();
  if (!s) return;
  if (schemaReady) return;

  // Basic schema, no fancy migrations for v1.
  await s/* sql */`
    create table if not exists tasks (
      id text primary key,
      title text not null,
      description text,
      assignee text not null,
      status text not null,
      priority text not null,
      created_at timestamptz not null,
      updated_at timestamptz not null
    );
    create index if not exists tasks_status_idx on tasks(status);
    create index if not exists tasks_updated_at_idx on tasks(updated_at desc);
  `;

  schemaReady = true;
}

import { z } from "zod";
import type { Board, Task } from "@/lib/types";
import { ASSIGNEES, PRIORITIES, STATUSES } from "@/lib/types";
import { ensureSchema, sql } from "@/lib/db";

const TaskRowSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  assignee: z.enum(ASSIGNEES),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  created_at: z.date(),
  updated_at: z.date(),
});

type TaskRow = z.infer<typeof TaskRowSchema>;

function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    assignee: r.assignee,
    status: r.status,
    priority: r.priority,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export async function readBoardDb(): Promise<Board> {
  const s = sql();
  if (!s) return { tasks: [] };
  await ensureSchema();

  const rows = await s<TaskRow[]>`
    select id, title, description, assignee, status, priority, created_at, updated_at
    from tasks
    order by updated_at desc
  `;

  const tasks = rows.map((r) => rowToTask(TaskRowSchema.parse(r)));
  return { tasks };
}

export async function upsertTaskDb(patch: Partial<Task> & Pick<Task, "id">): Promise<Task> {
  const s = sql();
  if (!s) throw new Error("DB_NOT_CONFIGURED");
  await ensureSchema();

  const now = new Date();

  const existing = await s<{ id: string; created_at: Date }[]>`
    select id, created_at
    from tasks
    where id = ${patch.id}
    limit 1
  `;

  if (existing.length === 0) {
    const createdAt = now;
    const t: Task = {
      id: patch.id,
      title: patch.title ?? "Untitled",
      description: patch.description,
      assignee: patch.assignee ?? "unassigned",
      status: patch.status ?? "backlog",
      priority: patch.priority ?? "med",
      createdAt: createdAt.toISOString(),
      updatedAt: now.toISOString(),
    };

    await s`
      insert into tasks (id, title, description, assignee, status, priority, created_at, updated_at)
      values (
        ${t.id},
        ${t.title},
        ${t.description ?? null},
        ${t.assignee},
        ${t.status},
        ${t.priority},
        ${createdAt},
        ${now}
      )
    `;

    return t;
  }

  // Update (only provided fields)
  const current = await s<TaskRow[]>`
    select id, title, description, assignee, status, priority, created_at, updated_at
    from tasks
    where id = ${patch.id}
    limit 1
  `;

  const cur = TaskRowSchema.parse(current[0]);
  const next: Task = {
    id: cur.id,
    title: patch.title ?? cur.title,
    description: patch.description ?? (cur.description ?? undefined),
    assignee: (patch.assignee ?? cur.assignee) as Task["assignee"],
    status: (patch.status ?? cur.status) as Task["status"],
    priority: (patch.priority ?? cur.priority) as Task["priority"],
    createdAt: cur.created_at.toISOString(),
    updatedAt: now.toISOString(),
  };

  await s`
    update tasks
    set
      title = ${next.title},
      description = ${next.description ?? null},
      assignee = ${next.assignee},
      status = ${next.status},
      priority = ${next.priority},
      updated_at = ${now}
    where id = ${next.id}
  `;

  return next;
}

export async function deleteTaskDb(id: string): Promise<void> {
  const s = sql();
  if (!s) throw new Error("DB_NOT_CONFIGURED");
  await ensureSchema();
  await s`delete from tasks where id = ${id}`;
}

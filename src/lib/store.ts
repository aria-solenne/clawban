import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Board, Task } from "@/lib/types";
import { ASSIGNEES, PRIORITIES, STATUSES } from "@/lib/types";
import { sql } from "@/lib/db";
import { deleteTaskDb, readBoardDb, upsertTaskDb } from "@/lib/store-db";

const TaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  assignee: z.enum(ASSIGNEES),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const BoardSchema = z.object({
  tasks: z.array(TaskSchema),
});

const dataPath = () => path.join(process.cwd(), "data", "board.json");

async function ensureFile() {
  const p = dataPath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  try {
    await fs.access(p);
  } catch {
    await fs.writeFile(p, JSON.stringify({ tasks: [] }, null, 2) + "\n", "utf8");
  }
}

/**
 * Storage strategy:
 * - If DATABASE_URL is set -> Postgres (Neon)
 * - Else -> local JSON file (Pi)
 */
export function storageMode(): "db" | "json" {
  return sql() ? "db" : "json";
}

export async function readBoard(): Promise<Board> {
  if (sql()) return readBoardDb();
  await ensureFile();
  const raw = await fs.readFile(dataPath(), "utf8");
  const parsed = JSON.parse(raw);
  return BoardSchema.parse(parsed);
}

export async function writeBoard(board: Board): Promise<void> {
  // JSON mode only (DB writes happen via upsert/delete)
  if (sql()) throw new Error("DB_MODE_NO_WRITEBOARD");
  await ensureFile();
  BoardSchema.parse(board);
  await fs.writeFile(dataPath(), JSON.stringify(board, null, 2) + "\n", "utf8");
}

export async function upsertTask(patch: Partial<Task> & Pick<Task, "id">): Promise<Task> {
  if (sql()) return upsertTaskDb(patch);

  const board = await readBoard();
  const now = new Date().toISOString();

  const idx = board.tasks.findIndex((t) => t.id === patch.id);

  if (idx === -1) {
    const created: Task = {
      id: patch.id,
      title: patch.title ?? "Untitled",
      description: patch.description,
      assignee: patch.assignee ?? "unassigned",
      status: patch.status ?? "backlog",
      priority: patch.priority ?? "med",
      createdAt: now,
      updatedAt: now,
    };
    board.tasks.unshift(created);
    await writeBoard(board);
    return created;
  }

  const next: Task = {
    ...board.tasks[idx],
    ...patch,
    updatedAt: now,
  };

  // keep createdAt stable
  next.createdAt = board.tasks[idx].createdAt;

  board.tasks[idx] = TaskSchema.parse(next);
  await writeBoard(board);
  return board.tasks[idx];
}

export async function deleteTask(id: string): Promise<void> {
  if (sql()) return deleteTaskDb(id);

  const board = await readBoard();
  board.tasks = board.tasks.filter((t) => t.id !== id);
  await writeBoard(board);
}

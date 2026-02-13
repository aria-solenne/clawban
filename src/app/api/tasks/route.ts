import { NextResponse } from "next/server";
import { z } from "zod";
import { readBoard, storageMode, upsertTask } from "@/lib/store";
import { requireEdit } from "@/lib/auth";
import { ASSIGNEES, PRIORITIES, STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignee: z.enum(ASSIGNEES).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
});

export async function GET() {
  const board = await readBoard();
  return NextResponse.json({ ...board, meta: { storage: storageMode() } });
}

export async function POST(req: Request) {
  try {
    await requireEdit(req);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = CreateSchema.parse(await req.json());
  const id = `t_${crypto.randomUUID()}`;
  const task = await upsertTask({ id, ...body });
  return NextResponse.json({ task }, { status: 201 });
}

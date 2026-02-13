import { NextResponse } from "next/server";
import { z } from "zod";
import { readBoard, upsertTask } from "@/lib/store";
import { ASSIGNEES, PRIORITIES, STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignee: z.enum(ASSIGNEES).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
});

export async function GET() {
  const board = await readBoard();
  return NextResponse.json(board);
}

export async function POST(req: Request) {
  const body = CreateSchema.parse(await req.json());
  const id = `t_${crypto.randomUUID()}`;
  const task = await upsertTask({ id, ...body });
  return NextResponse.json({ task }, { status: 201 });
}

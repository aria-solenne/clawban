import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteTask, upsertTask } from "@/lib/store";
import { ASSIGNEES, PRIORITIES, STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

const PatchSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    assignee: z.enum(ASSIGNEES).optional(),
    status: z.enum(STATUSES).optional(),
    priority: z.enum(PRIORITIES).optional(),
  })
  .strict();

export async function PATCH(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = PatchSchema.parse(await _req.json());
  const task = await upsertTask({ id, ...body });
  return NextResponse.json({ task });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await deleteTask(id);
  return NextResponse.json({ ok: true });
}

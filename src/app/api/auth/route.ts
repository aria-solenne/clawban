import { NextResponse } from "next/server";
import { z } from "zod";
import { canEditFromRequest, lock, unlockWithPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const canEdit = await canEditFromRequest();
  return NextResponse.json({ canEdit });
}

const UnlockSchema = z.object({ password: z.string().min(1) });

export async function POST(req: Request) {
  const { password } = UnlockSchema.parse(await req.json());
  const ok = await unlockWithPassword(password);
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await lock();
  return NextResponse.json({ ok: true });
}

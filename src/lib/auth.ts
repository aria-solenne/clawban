import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "clawban_edit";

type Payload = {
  iat: number; // ms
  exp: number; // ms
};

function secret(): string {
  const s = process.env.CLAWBAN_EDIT_PASSWORD;
  if (!s) {
    // If not set, default to view-only.
    return "";
  }
  return s;
}

function b64url(buf: Buffer | string) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function unb64url(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const norm = s.replaceAll("-", "+").replaceAll("_", "/") + pad;
  return Buffer.from(norm, "base64").toString("utf8");
}

function sign(data: string, sec: string) {
  return b64url(crypto.createHmac("sha256", sec).update(data).digest());
}

function makeToken(payload: Payload, sec: string) {
  const body = b64url(JSON.stringify(payload));
  const sig = sign(body, sec);
  return `${body}.${sig}`;
}

function verifyToken(token: string, sec: string): Payload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body, sec);
  // constant-time compare
  if (expected.length !== sig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const payload = JSON.parse(unb64url(body)) as Payload;
    if (typeof payload?.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function canEditFromRequest(): Promise<boolean> {
  const sec = secret();
  if (!sec) return false;
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;
  return !!verifyToken(token, sec);
}

export async function requireEdit(): Promise<void> {
  const ok = await canEditFromRequest();
  if (!ok) {
    throw new Error("EDIT_FORBIDDEN");
  }
}

export async function unlockWithPassword(pw: string): Promise<boolean> {
  const sec = secret();
  if (!sec) return false;
  if (pw !== sec) return false;

  const jar = await cookies();
  const now = Date.now();
  // 30 days
  const exp = now + 30 * 24 * 60 * 60 * 1000;
  const token = makeToken({ iat: now, exp }, sec);

  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // local http
    path: "/",
    expires: new Date(exp),
  });

  return true;
}

export async function lock(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires: new Date(0),
  });
}

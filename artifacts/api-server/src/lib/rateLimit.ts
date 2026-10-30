import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import { eq, lt, sql } from "drizzle-orm";
import { db, requestLimits } from "@workspace/db";

function keyFor(req: Request, scope: string): string {
  const ip = req.get("x-nf-client-connection-ip") || req.ip || "unknown";
  return `${scope}:${createHash("sha256").update(ip).digest("hex")}`;
}
export async function enforceRateLimit(req: Request, res: Response, scope: string, max: number, windowMs: number): Promise<boolean> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowMs);
    const [entry] = await db.insert(requestLimits).values({ key: keyFor(req, scope), count: 1, expiresAt })
      .onConflictDoUpdate({
        target: requestLimits.key,
        set: {
          count: sql`case when ${requestLimits.expiresAt} <= ${now} then 1 else ${requestLimits.count} + 1 end`,
          expiresAt: sql`case when ${requestLimits.expiresAt} <= ${now} then ${expiresAt} else ${requestLimits.expiresAt} end`,
        },
      }).returning();
    // Bound stored state without resetting other active clients' limits.
    await db.delete(requestLimits).where(lt(requestLimits.expiresAt, now));
    if (entry.count <= max) return true;
    res.setHeader("Retry-After", Math.max(1, Math.ceil((entry.expiresAt.getTime() - now.getTime()) / 1000)));
    res.status(429).json({ error: scope === "admin" ? "Too many attempts. Wait 15 minutes and try again." : "Too many requests. Please wait before trying again." });
  } catch {
    req.log.error("Request limit database is temporarily unavailable");
    res.status(503).json({ error: "The store database is temporarily unavailable. Please try again shortly." });
  }
  return false;
}
export async function clearRateLimit(req: Request, scope: string): Promise<void> {
  await db.delete(requestLimits).where(eq(requestLimits.key, keyFor(req, scope)));
}

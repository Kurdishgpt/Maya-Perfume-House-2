import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

type ClerkEmailAddress = {
  email_address?: string;
  verification?: { status?: string };
};

type ClerkUserResponse = {
  email_addresses?: ClerkEmailAddress[];
};

/**
 * Allow only the configured, verified administrator to write catalog data.
 * Clerk session cookies are verified by clerkMiddleware before this executes.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in to manage the catalog." });
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!adminEmail || !secretKey) {
    req.log.error("Admin access is not configured");
    res.status(503).json({ error: "Administrator access is not configured." });
    return;
  }

  try {
    const response = await fetch(
      `https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      req.log.error(
        { statusCode: response.status },
        "Could not verify administrator identity",
      );
      res.status(503).json({ error: "Could not verify administrator access." });
      return;
    }

    const user = (await response.json()) as ClerkUserResponse;
    const isAdmin = user.email_addresses?.some(
      (address) =>
        address.email_address?.trim().toLowerCase() === adminEmail &&
        address.verification?.status === "verified",
    );

    if (!isAdmin) {
      res.status(403).json({ error: "Administrator access is required." });
      return;
    }

    next();
  } catch (error) {
    req.log.error({ err: error }, "Administrator identity check failed");
    res.status(503).json({ error: "Could not verify administrator access." });
  }
}

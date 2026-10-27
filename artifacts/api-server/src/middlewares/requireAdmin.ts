import { getAuth } from "@clerk/express";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const passcodeCookieName = "maya_admin_unlock";
const passcodeCookieMaxAge = 30 * 60;

type ClerkEmailAddress = {
  email_address?: string;
  verification?: { status?: string };
};

type ClerkUserResponse = {
  email_addresses?: ClerkEmailAddress[];
};

async function getVerifiedAdminUserId(
  req: Request,
  res: Response,
): Promise<string | null> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in to manage the catalog." });
    return null;
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!adminEmail || !secretKey) {
    req.log.error("Admin access is not configured");
    res.status(503).json({ error: "Administrator access is not configured." });
    return null;
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
      return null;
    }

    const user = (await response.json()) as ClerkUserResponse;
    const isAdmin = user.email_addresses?.some(
      (address) =>
        address.email_address?.trim().toLowerCase() === adminEmail &&
        address.verification?.status === "verified",
    );

    if (!isAdmin) {
      res.status(403).json({ error: "Administrator access is required." });
      return null;
    }

    return userId;
  } catch (error) {
    req.log.error({ err: error }, "Administrator identity check failed");
    res.status(503).json({ error: "Could not verify administrator access." });
    return null;
  }
}

function signPasscodeUnlock(userId: string, expiresAt: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${userId}:${expiresAt}`)
    .digest("base64url");
}

export function isAdminPasscodeUnlocked(req: Request, userId: string): boolean {
  const secret = process.env.SESSION_SECRET;
  const cookieHeader = req.headers.cookie;
  if (!secret || !cookieHeader) return false;

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${passcodeCookieName}=`));
  if (!cookie) return false;

  const token = cookie.slice(passcodeCookieName.length + 1);
  const separator = token.indexOf(".");
  if (separator < 1) return false;

  const expiresAt = Number(token.slice(0, separator));
  const signature = token.slice(separator + 1);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return false;
  if (!/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;

  const expected = Buffer.from(signPasscodeUnlock(userId, expiresAt, secret), "base64url");
  const received = Buffer.from(signature, "base64url");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function setAdminPasscodeCookie(res: Response, userId: string): boolean {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;

  const expiresAt = Date.now() + passcodeCookieMaxAge * 1000;
  const signature = signPasscodeUnlock(userId, expiresAt, secret);
  const cookieParts = [
    `${passcodeCookieName}=${expiresAt}.${signature}`,
    "Path=/api",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${passcodeCookieMaxAge}`,
  ];
  if (process.env.NODE_ENV === "production") cookieParts.push("Secure");
  res.setHeader("Set-Cookie", cookieParts.join("; "));
  return true;
}

export function clearAdminPasscodeCookie(res: Response): void {
  const cookieParts = [
    `${passcodeCookieName}=`,
    "Path=/api",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
  ];
  if (process.env.NODE_ENV === "production") cookieParts.push("Secure");
  res.setHeader("Set-Cookie", cookieParts.join("; "));
}

function passcodesMatch(received: string, expected: string): boolean {
  const receivedDigest = createHash("sha256").update(received).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(receivedDigest, expectedDigest);
}

export async function requireAdminIdentity(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = await getVerifiedAdminUserId(req, res);
  if (userId) next();
}

/**
 * Mutating catalog routes require both the verified Clerk admin and the
 * short-lived server-signed passcode cookie.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = await getVerifiedAdminUserId(req, res);
  if (!userId) return;

  if (!isAdminPasscodeUnlocked(req, userId)) {
    res.status(403).json({ error: "Unlock the admin panel before changing the catalog." });
    return;
  }

  next();
}

export function verifyAdminPasscode(received: string, expected: string): boolean {
  return passcodesMatch(received, expected);
}

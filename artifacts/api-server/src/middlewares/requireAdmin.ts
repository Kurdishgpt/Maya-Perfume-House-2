import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const passcodeCookieName = "maya_admin_unlock";
const passcodeCookieMaxAge = 30 * 60;

// Netlify exposes invocation-scoped settings through its runtime API.
function adminSetting(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    Netlify?: { env?: { get: (key: string) => string | undefined } };
  };
  return runtime.Netlify?.env?.get(name) ?? process.env[name];
}

export function isAdminAccessConfigured(): boolean {
  return Boolean(adminSetting("SESSION_SECRET") && adminSetting("ADMIN_PANEL_PASSWORD"));
}

function signPasscodeUnlock(expiresAt: number, secret: string): string {
  return createHmac("sha256", secret).update(String(expiresAt)).digest("base64url");
}

function readCookie(req: Request): string | undefined {
  return req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${passcodeCookieName}=`))
    ?.slice(passcodeCookieName.length + 1);
}

export function isAdminPasscodeUnlocked(req: Request): boolean {
  const secret = adminSetting("SESSION_SECRET");
  const token = readCookie(req);
  if (!secret || !token) return false;

  const separator = token.indexOf(".");
  if (separator < 1) return false;
  const expiresAt = Number(token.slice(0, separator));
  const signature = token.slice(separator + 1);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return false;
  if (!/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;

  const expected = Buffer.from(signPasscodeUnlock(expiresAt, secret), "base64url");
  const received = Buffer.from(signature, "base64url");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function setAdminPasscodeCookie(res: Response): boolean {
  const secret = adminSetting("SESSION_SECRET");
  if (!secret) return false;

  const expiresAt = Date.now() + passcodeCookieMaxAge * 1000;
  const signature = signPasscodeUnlock(expiresAt, secret);
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

export function verifyAdminPasscode(received: string): boolean {
  const adminPasscode = adminSetting("ADMIN_PANEL_PASSWORD");
  if (!adminPasscode) return false;
  const receivedDigest = createHash("sha256").update(received).digest();
  const expectedDigest = createHash("sha256").update(adminPasscode).digest();
  return timingSafeEqual(receivedDigest, expectedDigest);
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!isAdminPasscodeUnlocked(req)) {
    res.status(401).json({ error: "Unlock the admin panel before changing the catalog." });
    return;
  }

  next();
}

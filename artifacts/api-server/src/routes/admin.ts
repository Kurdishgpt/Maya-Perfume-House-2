import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  GetAdminAccessResponse,
  GetAdminPasscodeStatusResponse,
  UnlockAdminPasscodeBody,
  UnlockAdminPasscodeResponse,
} from "@workspace/api-zod";
import {
  clearAdminPasscodeCookie,
  isAdminPasscodeUnlocked,
  requireAdminIdentity,
  setAdminPasscodeCookie,
  verifyAdminPasscode,
} from "../middlewares/requireAdmin";

const router: IRouter = Router();
const maxAttempts = 5;
const attemptWindowMs = 15 * 60 * 1000;
const failedAttempts = new Map<string, { count: number; startedAt: number }>();

router.get("/admin/access", requireAdminIdentity, (_req, res): void => {
  res.json(GetAdminAccessResponse.parse({ allowed: true }));
});

router.get("/admin/passcode", requireAdminIdentity, (req, res): void => {
  if (!process.env.ADMIN_PANEL_PASSWORD || !process.env.SESSION_SECRET) {
    req.log.error("Admin passcode is not configured");
    res.status(503).json({ error: "Admin passcode is not configured." });
    return;
  }

  const { userId } = getAuth(req);
  res.json(
    GetAdminPasscodeStatusResponse.parse({
      unlocked: Boolean(userId && isAdminPasscodeUnlocked(req, userId)),
    }),
  );
});

router.post("/admin/passcode", requireAdminIdentity, (req, res): void => {
  const parsed = UnlockAdminPasscodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter the admin passphrase." });
    return;
  }

  const configuredPasscode = process.env.ADMIN_PANEL_PASSWORD;
  if (!configuredPasscode || !process.env.SESSION_SECRET) {
    req.log.error("Admin passcode is not configured");
    res.status(503).json({ error: "Admin passcode is not configured." });
    return;
  }

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in to unlock the admin panel." });
    return;
  }

  const now = Date.now();
  const current = failedAttempts.get(userId);
  if (current && now - current.startedAt < attemptWindowMs && current.count >= maxAttempts) {
    res.status(429).json({ error: "Too many attempts. Wait 15 minutes and try again." });
    return;
  }

  const attempts =
    current && now - current.startedAt < attemptWindowMs
      ? current
      : { count: 0, startedAt: now };

  if (!verifyAdminPasscode(parsed.data.passcode, configuredPasscode)) {
    attempts.count += 1;
    failedAttempts.set(userId, attempts);
    res.status(403).json({ error: "That passphrase was not accepted." });
    return;
  }

  failedAttempts.delete(userId);
  if (!setAdminPasscodeCookie(res, userId)) {
    req.log.error("Admin passcode signing is not configured");
    res.status(503).json({ error: "Admin passcode is not configured." });
    return;
  }

  res.json(UnlockAdminPasscodeResponse.parse({ unlocked: true }));
});

router.delete("/admin/passcode", requireAdminIdentity, (_req, res): void => {
  clearAdminPasscodeCookie(res);
  res.sendStatus(204);
});

export default router;

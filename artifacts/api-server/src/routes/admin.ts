import { enforceRateLimit, clearRateLimit } from "../lib/rateLimit";
import { Router, type IRouter } from "express";
import {
  GetAdminPasscodeStatusResponse,
  UnlockAdminPasscodeBody,
  UnlockAdminPasscodeResponse,
} from "@workspace/api-zod";
import {
  clearAdminPasscodeCookie,
  isAdminPasscodeUnlocked,
  isAdminAccessConfigured,
  setAdminPasscodeCookie,
  verifyAdminPasscode,
} from "../middlewares/requireAdmin";

const router: IRouter = Router();
router.use("/admin/passcode", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.get("/admin/passcode", (req, res): void => {
  if (!isAdminAccessConfigured()) {
    req.log.error("Admin password or session signing is not configured");
    res.status(503).json({ error: "Admin access is not configured." });
    return;
  }

  res.json(
    GetAdminPasscodeStatusResponse.parse({
      unlocked: isAdminPasscodeUnlocked(req),
    }),
  );
});

router.post("/admin/passcode", async (req, res): Promise<void> => {
  const parsed = UnlockAdminPasscodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter the admin passphrase." });
    return;
  }
  if (!isAdminAccessConfigured()) {
    req.log.error("Admin password or session signing is not configured");
    res.status(503).json({ error: "Admin access is not configured." });
    return;
  }

  if (!await enforceRateLimit(req, res, "admin", 5, 15 * 60 * 1000)) return;

  if (!verifyAdminPasscode(parsed.data.passcode)) {
    res.status(403).json({ error: "That passphrase was not accepted." });
    return;
  }

  await clearRateLimit(req, "admin");
  if (!setAdminPasscodeCookie(res)) {
    res.status(503).json({ error: "Admin access is not configured." });
    return;
  }
  res.json(UnlockAdminPasscodeResponse.parse({ unlocked: true }));
});

router.delete("/admin/passcode", (_req, res): void => {
  clearAdminPasscodeCookie(res);
  res.sendStatus(204);
});

export default router;

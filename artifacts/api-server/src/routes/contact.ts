import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  DeleteAdminContactMessageParams,
  GetAdminContactSettingsResponse,
  GetPublicContactSettingsResponse,
  ListAdminContactMessagesResponse,
  SubmitContactMessageBody,
  SubmitContactMessageResponse,
  UpdateAdminContactMessageBody,
  UpdateAdminContactMessageParams,
  UpdateAdminContactMessageResponse,
  UpdateAdminContactSettingsBody,
  UpdateAdminContactSettingsResponse,
} from "@workspace/api-zod";
import { contactMessagesTable, db, storeContactSettingsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();
const submitWindowMs = 15 * 60 * 1000;
const submitLimit = 5;
const submissionsByIp = new Map<string, { startedAt: number; count: number }>();

function settingsResponse(row: typeof storeContactSettingsTable.$inferSelect | undefined) {
  return {
    store_hours: row?.storeHours.trim() || null,
    updated_at: row?.updatedAt.toISOString() ?? null,
  };
}

function messageResponse(row: typeof contactMessagesTable.$inferSelect) {
  return {
    id: row.id,
    full_name: row.fullName,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    is_read: row.isRead,
    created_at: row.createdAt.toISOString(),
  };
}

function allowSubmission(ip: string) {
  const now = Date.now();
  if (submissionsByIp.size > 10_000) {
    for (const [key, value] of submissionsByIp) {
      if (now - value.startedAt >= submitWindowMs) submissionsByIp.delete(key);
    }
  }

  const current = submissionsByIp.get(ip);
  if (!current || now - current.startedAt >= submitWindowMs) {
    submissionsByIp.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= submitLimit) return false;
  current.count += 1;
  return true;
}

router.get("/contact/settings", async (_req, res): Promise<void> => {
  try {
    const [row] = await db.select().from(storeContactSettingsTable).where(eq(storeContactSettingsTable.id, 1)).limit(1);
    res.setHeader("Cache-Control", "no-store");
    res.json(GetPublicContactSettingsResponse.parse(settingsResponse(row)));
  } catch (error) {
    _req.log.error({ err: error }, "Failed to read public contact settings");
    res.status(500).json({ error: "Contact information is temporarily unavailable." });
  }
});

router.post("/contact/messages", async (req, res): Promise<void> => {
  if (!allowSubmission(req.ip || "unknown")) {
    res.status(429).json({ error: "Too many messages. Please try again later." });
    return;
  }

  const parsed = SubmitContactMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please check the required contact form fields." });
    return;
  }

  const fullName = parsed.data.full_name.trim();
  const email = parsed.data.email.trim();
  const message = parsed.data.message.trim();
  if (fullName.length < 2 || message.length < 10) {
    res.status(400).json({ error: "Please check the required contact form fields." });
    return;
  }

  try {
    const [saved] = await db.insert(contactMessagesTable).values({
      fullName,
      email,
      phone: parsed.data.phone?.trim() || null,
      subject: parsed.data.subject,
      message,
    }).returning({ id: contactMessagesTable.id });
    if (!saved) {
      res.status(500).json({ error: "Your message could not be saved. Please try again." });
      return;
    }

    res.status(201).json(SubmitContactMessageResponse.parse({ id: saved.id, received: true }));
  } catch (error) {
    req.log.error({ err: error }, "Failed to save customer contact message");
    res.status(500).json({ error: "Your message could not be saved. Please try again." });
  }
});

router.use("/admin/contact", requireAdmin, (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.get("/admin/contact/settings", async (_req, res): Promise<void> => {
  try {
    const [row] = await db.select().from(storeContactSettingsTable).where(eq(storeContactSettingsTable.id, 1)).limit(1);
    res.json(GetAdminContactSettingsResponse.parse(settingsResponse(row)));
  } catch (error) {
    _req.log.error({ err: error }, "Failed to read admin contact settings");
    res.status(500).json({ error: "Contact settings are temporarily unavailable." });
  }
});

router.patch("/admin/contact/settings", async (req, res): Promise<void> => {
  const parsed = UpdateAdminContactSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please enter store hours under 1,000 characters." });
    return;
  }

  try {
    const storeHours = parsed.data.store_hours?.trim() || "";
    const [row] = await db.insert(storeContactSettingsTable)
      .values({ id: 1, storeHours })
      .onConflictDoUpdate({
        target: storeContactSettingsTable.id,
        set: { storeHours, updatedAt: new Date() },
      })
      .returning();
    res.json(UpdateAdminContactSettingsResponse.parse(settingsResponse(row)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to update store hours");
    res.status(500).json({ error: "Store hours could not be saved. Please try again." });
  }
});

router.get("/admin/contact/messages", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(contactMessagesTable).orderBy(desc(contactMessagesTable.createdAt));
    res.json(ListAdminContactMessagesResponse.parse(rows.map(messageResponse)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to list admin contact messages");
    res.status(500).json({ error: "The contact inbox is temporarily unavailable." });
  }
});

router.patch("/admin/contact/messages/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminContactMessageParams.safeParse(req.params);
  const body = UpdateAdminContactMessageBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid contact message update." });
    return;
  }

  try {
    const [row] = await db.update(contactMessagesTable)
      .set({ isRead: body.data.is_read })
      .where(eq(contactMessagesTable.id, params.data.id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Contact message not found." });
      return;
    }
    res.json(UpdateAdminContactMessageResponse.parse(messageResponse(row)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to update admin contact message");
    res.status(500).json({ error: "The contact message could not be updated." });
  }
});

router.delete("/admin/contact/messages/:id", async (req, res): Promise<void> => {
  const params = DeleteAdminContactMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid contact message." });
    return;
  }

  try {
    const deleted = await db.delete(contactMessagesTable).where(eq(contactMessagesTable.id, params.data.id)).returning({ id: contactMessagesTable.id });
    if (!deleted.length) {
      res.status(404).json({ error: "Contact message not found." });
      return;
    }
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete admin contact message");
    res.status(500).json({ error: "The contact message could not be deleted." });
  }
});

export default router;

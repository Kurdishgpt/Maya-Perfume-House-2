import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();
router.get("/healthz", (_req, res) => { res.json(HealthCheckResponse.parse({ status: "ok" })); });
router.get("/database/status", requireAdmin, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  try {
    // Check every runtime table without reading customer data.
    await db.execute(sql`select
      (select count(*) from store_products where false),
      (select count(*) from carts where false),
      (select count(*) from cart_items where false),
      (select count(*) from orders where false),
      (select count(*) from order_items where false),
      (select count(*) from site_settings where false),
      (select count(*) from contact_messages where false),
      (select count(*) from store_contact_settings where false),
      (select count(*) from raw_materials where false),
      (select count(*) from raw_material_import_runs where false),
      (select count(*) from request_limits where false)`);
    res.json({ status: "connected", message: "The store database is connected." });
  } catch (error) {
    const e = error as { code?: string; cause?: { code?: string } };
    const code = e.cause?.code ?? e.code;
    req.log.warn({ code }, "Store database readiness check failed");
    res.status(503).json({
      status: code === "42P01" ? "schema_not_ready" : "unavailable",
      message: code === "42P01" ? "The store database is waiting for the deployment migration." : "The store database connection is temporarily unavailable.",
    });
  }
});
export default router;

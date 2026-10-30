import { asc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, rawMaterialsTable } from "@workspace/db";
import {
  AddHillenRawMaterialBody, AddHillenRawMaterialResponse,
  DeleteRawMaterialParams, ImportHillenMaterialsBody, ImportHillenMaterialsResponse,
  ListAdminRawMaterialsResponse, ListRawMaterialsResponse,
  ResearchRawMaterialsBody, ResearchRawMaterialsResponse,
  UpdateRawMaterialBody, UpdateRawMaterialParams, UpdateRawMaterialResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/requireAdmin";
import { fetchHillenMaterial, fetchHillenPage, HillenError, parseHillenMaterial, searchHillenMaterials, type HillenMaterial } from "../lib/hillenCatalog";
import { explainRawMaterials } from "../lib/rawMaterialAi";

const router: IRouter = Router();
const calls = new Map<string, { at: number; count: number }>();

function api(row: typeof rawMaterialsTable.$inferSelect) {
  return {
    id: row.id, source_id: row.sourceId, name: row.name, description: row.description,
    category: row.category, price: row.price, currency: row.currency,
    source_price: row.sourcePrice, source_currency: row.sourceCurrency,
    image_url: row.imageUrl, source_url: row.sourceUrl,
    supplier_available: row.supplierAvailable, published: row.published,
    imported_at: row.importedAt.toISOString(),
  };
}
function values(material: HillenMaterial) {
  return {
    sourceId: material.source_id, name: material.name, description: material.description,
    category: material.category, price: material.price, currency: material.currency,
    sourcePrice: material.price, sourceCurrency: material.currency,
    imageUrl: material.image_url, sourceUrl: material.source_url,
    supplierAvailable: material.supplier_available, published: true,
  };
}

router.get("/raw-materials", async (_req, res): Promise<void> => {
  const rows = await db.select().from(rawMaterialsTable).where(eq(rawMaterialsTable.published, true)).orderBy(asc(rawMaterialsTable.name));
  res.json(ListRawMaterialsResponse.parse(rows.map(api)));
});

router.use("/admin/raw-materials", requireAdmin, (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET" || req.method === "PATCH" || req.method === "DELETE") { next(); return; }
  const key = req.ip ?? "unknown";
  const now = Date.now();
  if (calls.size > 1000) for (const [ip, value] of calls) if (now - value.at >= 60_000) calls.delete(ip);
  const entry = calls.get(key);
  if (!entry || now - entry.at >= 60_000) calls.set(key, { at: now, count: 1 });
  else if (++entry.count > 40) { res.status(429).json({ error: "Please wait before requesting more supplier data." }); return; }
  next();
});

router.get("/admin/raw-materials", async (_req, res): Promise<void> => {
  const rows = await db.select().from(rawMaterialsTable).orderBy(asc(rawMaterialsTable.name));
  res.json(ListAdminRawMaterialsResponse.parse(rows.map(api)));
});

router.post("/admin/raw-materials/import", async (req, res): Promise<void> => {
  const input = ImportHillenMaterialsBody.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: "Enter a valid supplier catalog page." }); return; }
  try {
    const { products, total, totalPages } = await fetchHillenPage(input.data.page);
    const parsed = products.map(parseHillenMaterial);
    const valid = parsed.flatMap((item) => item ? [values(item.material)] : []);
    const created = valid.length ? await db.insert(rawMaterialsTable).values(valid)
      .onConflictDoNothing({ target: rawMaterialsTable.sourceId }).returning({ id: rawMaterialsTable.id }) : [];
    const issues = parsed.flatMap((item, index) => item ? [] : [
      `Supplier item ${(products[index] as { id?: unknown })?.id ?? index + 1} skipped: unsupported item type, missing price, or invalid supplier data.`,
    ]);
    res.json(ImportHillenMaterialsResponse.parse({
      page: input.data.page, total_pages: totalPages, total, created: created.length,
      skipped: products.length - created.length, processed: products.length,
      complete: input.data.page >= totalPages, issues,
    }));
  } catch (error) {
    req.log.warn({ reason: error instanceof HillenError ? error.message : "Database import failed" }, "Raw material import failed");
    res.status(error instanceof HillenError ? 502 : 500).json({
      error: error instanceof HillenError ? error.message : "This page could not be saved. Retry safely; earlier pages and existing prices are preserved.",
    });
  }
});

router.post("/admin/raw-materials/research", async (req, res): Promise<void> => {
  const input = ResearchRawMaterialsBody.safeParse(req.body);
  if (!input.success || input.data.query.trim().length < 2) { res.status(400).json({ error: "Enter a material name or keyword between 2 and 120 characters." }); return; }
  try {
    const matches = await searchHillenMaterials(input.data.query.trim());
    let answer = "";
    let warning = "";
    if (matches.length) {
      try { answer = await explainRawMaterials(input.data.query.trim(), matches); }
      catch (error) { warning = error instanceof Error ? error.message : "AI explanation is unavailable. Verified supplier results are shown."; }
    }
    res.json(ResearchRawMaterialsResponse.parse({ answer, warning, matches: matches.map((match) => match.material) }));
  } catch (error) {
    req.log.warn({ reason: error instanceof HillenError ? error.message : "Supplier search failed" }, "Raw material research failed");
    res.status(502).json({ error: error instanceof HillenError ? error.message : "Supplier search could not complete. Please try again." });
  }
});

router.post("/admin/raw-materials", async (req, res): Promise<void> => {
  const input = AddHillenRawMaterialBody.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: "Select a verified Hillen99 material." }); return; }
  try {
    const [existing] = await db.select().from(rawMaterialsTable).where(eq(rawMaterialsTable.sourceId, input.data.source_id));
    if (existing) { res.json(AddHillenRawMaterialResponse.parse(api(existing))); return; }
    const { material } = await fetchHillenMaterial(input.data.source_id);
    await db.insert(rawMaterialsTable).values(values(material)).onConflictDoNothing({ target: rawMaterialsTable.sourceId });
    const [saved] = await db.select().from(rawMaterialsTable).where(eq(rawMaterialsTable.sourceId, input.data.source_id));
    if (!saved) throw new Error("Import did not persist");
    res.json(AddHillenRawMaterialResponse.parse(api(saved)));
  } catch (error) {
    req.log.warn({ reason: error instanceof HillenError ? error.message : "Import failed" }, "Single material import failed");
    res.status(error instanceof HillenError ? 502 : 500).json({ error: error instanceof HillenError ? error.message : "The material could not be imported." });
  }
});

router.patch("/admin/raw-materials/:id", async (req, res): Promise<void> => {
  const params = UpdateRawMaterialParams.safeParse(req.params);
  const input = UpdateRawMaterialBody.safeParse(req.body);
  if (!params.success || !input.success || !Object.keys(input.data).length ||
      (input.data.name !== undefined && !input.data.name.trim()) ||
      (input.data.category !== undefined && !input.data.category.trim())) {
    res.status(400).json({ error: "Enter valid material details and a nonnegative price." }); return;
  }
  const data = input.data;
  const [row] = await db.update(rawMaterialsTable).set({
    ...data,
    ...(data.name !== undefined ? { name: data.name.trim() } : {}),
    ...(data.category !== undefined ? { category: data.category.trim() } : {}),
  }).where(eq(rawMaterialsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Material not found." }); return; }
  res.json(UpdateRawMaterialResponse.parse(api(row)));
});

router.delete("/admin/raw-materials/:id", async (req, res): Promise<void> => {
  const params = DeleteRawMaterialParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid material ID." }); return; }
  const [row] = await db.delete(rawMaterialsTable).where(eq(rawMaterialsTable.id, params.data.id)).returning({ id: rawMaterialsTable.id });
  if (!row) { res.status(404).json({ error: "Material not found." }); return; }
  res.sendStatus(204);
});

export default router;

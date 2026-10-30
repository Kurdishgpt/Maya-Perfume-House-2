import { asc, desc, eq, inArray, and, isNull, lt, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { db, rawMaterialImportRunsTable, rawMaterialsTable } from "@workspace/db";
import {
  AddHillenRawMaterialBody, AddHillenRawMaterialResponse,
  CreateRawMaterialImportBody, CreateRawMaterialImportResponse, DeleteRawMaterialParams,
  GetRawMaterialImportParams, GetRawMaterialImportResponse, ImportHillenMaterialsBody, ImportHillenMaterialsResponse,
  ListHillenRawMaterialCategoriesResponse, ListRawMaterialImportsResponse,
  ListAdminRawMaterialsResponse, ListRawMaterialsResponse,
  ResearchRawMaterialsBody, ResearchRawMaterialsResponse,
  UpdateRawMaterialBody, UpdateRawMaterialParams, UpdateRawMaterialResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/requireAdmin";
import { fetchHillenCategories, fetchHillenMaterial, fetchHillenPage, HillenError, parseHillenMaterial, searchHillenMaterials, type HillenMaterial } from "../lib/hillenCatalog";
import { explainRawMaterials } from "../lib/rawMaterialAi";

const router: IRouter = Router();
const calls = new Map<string, { at: number; count: number }>();

function api(row: typeof rawMaterialsTable.$inferSelect) {
  return {
    id: row.id, source_id: row.sourceId, name: row.name, description: row.description,
    source_sku: row.sourceSku, source_description: row.sourceDescription,
    category: row.category, price: row.price, currency: row.currency,
    source_price: row.sourcePrice, source_currency: row.sourceCurrency,
    image_url: row.imageUrl, source_url: row.sourceUrl,
    supplier_available: row.supplierAvailable, published: row.published,
    unit: row.sourceUnit, quantity_options: row.quantityOptions,
    imported_at: row.importedAt.toISOString(),
  };
}
function values(material: HillenMaterial) {
  return {
    sourceId: material.source_id, sourceSku: material.source_sku, name: material.name,
    sourceName: material.name, sourceDescription: material.source_description,
    sourceCategory: material.category, sourceImageUrl: material.image_url,
    sourceAvailable: material.supplier_available,
    description: material.description, category: material.category,
    price: material.price, currency: material.currency,
    sourcePrice: material.price, sourceCurrency: material.currency,
    imageUrl: material.image_url, sourceUrl: material.source_url,
    sourceUnit: material.unit, quantityOptions: material.quantity_options,
    supplierAvailable: material.supplier_available, published: true,
  };
}
function importJob(row: typeof rawMaterialImportRunsTable.$inferSelect) {
  return {
    id: row.id, mode: row.mode, status: row.status,
    category_id: row.categoryId, category_name: row.categoryName,
    next_page: row.nextPage, total_pages: row.totalPages,
    discovered: row.discovered, created: row.created, updated: row.updated,
    skipped: row.skipped, processed: row.processed,
    source_ids: row.sourceIds, categories: row.categories,
    processed_pages: row.processedPages, failed_pages: row.failedPages,
    errors: row.errors, created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    completed_at: row.completedAt?.toISOString() ?? null,
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

router.get("/admin/raw-materials/categories", async (req, res): Promise<void> => {
  try { res.json(ListHillenRawMaterialCategoriesResponse.parse(await fetchHillenCategories())); }
  catch (error) {
    req.log.warn({ reason: error instanceof HillenError ? error.message : "Supplier category discovery failed" }, "Raw material categories unavailable");
    res.status(502).json({ error: error instanceof HillenError ? error.message : "Supplier categories could not be discovered." });
  }
});

router.get("/admin/raw-materials/imports", async (_req, res): Promise<void> => {
  const rows = await db.select().from(rawMaterialImportRunsTable)
    .orderBy(desc(rawMaterialImportRunsTable.createdAt)).limit(25);
  res.json(ListRawMaterialImportsResponse.parse(rows.map(importJob)));
});

router.post("/admin/raw-materials/imports", async (req, res): Promise<void> => {
  const input = CreateRawMaterialImportBody.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: "Select dry run or import, and a valid discovered source category." }); return; }
  const categoryId = input.data.category_id ?? null;
  let categoryName = "All categories";
  if (categoryId !== null) {
    try {
      const category = (await fetchHillenCategories()).find((item) => item.id === categoryId);
      if (!category) { res.status(400).json({ error: "Select a current Hillen99 category." }); return; }
      categoryName = category.name;
    } catch (error) {
      res.status(502).json({ error: error instanceof HillenError ? error.message : "Supplier categories could not be discovered." });
      return;
    }
  }
  const [run] = await db.insert(rawMaterialImportRunsTable).values({
    mode: input.data.mode, status: "running", categoryId, categoryName,
  }).returning();
  if (!run) { res.status(500).json({ error: "The import run could not be saved." }); return; }
  res.status(201).json(CreateRawMaterialImportResponse.parse(importJob(run)));
});

router.get("/admin/raw-materials/imports/:id", async (req, res): Promise<void> => {
  const params = GetRawMaterialImportParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid import run ID." }); return; }
  const [run] = await db.select().from(rawMaterialImportRunsTable).where(eq(rawMaterialImportRunsTable.id, params.data.id));
  if (!run) { res.status(404).json({ error: "Import run not found." }); return; }
  res.json(GetRawMaterialImportResponse.parse(importJob(run)));
});

router.post("/admin/raw-materials/imports/:id/step", async (req, res): Promise<void> => {
  const params = GetRawMaterialImportParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid import run ID." }); return; }
  const id = params.data.id;
  const now = new Date();
  const lease = randomUUID();
  const [run] = await db.update(rawMaterialImportRunsTable)
    .set({ leaseToken: lease, leaseUntil: new Date(now.getTime() + 30_000), updatedAt: now, status: "running" })
    .where(and(eq(rawMaterialImportRunsTable.id, id), or(
      isNull(rawMaterialImportRunsTable.leaseUntil), lt(rawMaterialImportRunsTable.leaseUntil, now),
    )))
    .returning();
  if (!run) {
    const [current] = await db.select().from(rawMaterialImportRunsTable).where(eq(rawMaterialImportRunsTable.id, id));
    if (!current) { res.status(404).json({ error: "Import run not found." }); return; }
    if (current.status === "complete") { res.json(importJob(current)); return; }
    res.status(409).json({ error: "This saved import is already processing a page. Wait before resuming it." });
    return;
  }
  const retryPage = run.failedPages[0];
  const page = retryPage ?? run.nextPage;
  if (run.status === "complete" || (run.totalPages > 0 && page > run.totalPages)) {
    const [completed] = await db.update(rawMaterialImportRunsTable)
      .set({ status: run.failedPages.length ? "partial" : "complete", leaseToken: null, leaseUntil: null,
        completedAt: run.failedPages.length ? null : now, updatedAt: now })
      .where(and(eq(rawMaterialImportRunsTable.id, id), eq(rawMaterialImportRunsTable.leaseToken, lease)))
      .returning();
    res.json(GetRawMaterialImportResponse.parse(importJob(completed ?? run)));
    return;
  }
  const pageUrl = `https://hillen99.com/wp-json/wc/store/v1/products?per_page=100&page=${page}${run.categoryId ? `&category=${run.categoryId}` : ""}`;
  try {
    const result = await fetchHillenPage(page, run.categoryId ?? undefined);
    const entries = result.products.map(parseHillenMaterial);
    const pageMaterials = [...new Map(entries.flatMap((entry) => entry ? [[entry.material.source_id, entry.material] as const] : [])).values()];
    const pageIds = pageMaterials.map((material) => material.source_id);
    const existingRows = pageIds.length
      ? await db.select({ sourceId: rawMaterialsTable.sourceId }).from(rawMaterialsTable)
          .where(inArray(rawMaterialsTable.sourceId, pageIds))
      : [];
    const existingIds = new Set(existingRows.map((row) => row.sourceId));
    const sourceIds = new Set([...run.sourceIds, ...pageIds]);
    const categories = new Set([...run.categories, ...pageMaterials.flatMap((item) => item.category.split(" / ").map((name) => name.trim()).filter(Boolean))]);
    const newlySeenIds = pageIds.filter((sourceId) => !run.sourceIds.includes(sourceId));
    const unsupported = entries.filter((entry) => !entry).length;
    const records = pageMaterials.map(values);
    const completedPages = [...new Set([...run.processedPages, page])].sort((a, b) => a - b);
    const failedPages = run.failedPages.filter((failed) => failed !== page);
    const nextPage = page === run.nextPage ? page + 1 : run.nextPage;
    const complete = nextPage > result.totalPages && failedPages.length === 0;
    const updatedAt = new Date();
    const [saved] = await db.transaction(async (tx) => {
      let written: { sourceId: number }[] = [];
      if (run.mode === "import" && records.length) {
        written = await tx.insert(rawMaterialsTable).values(records)
          .onConflictDoUpdate({
            target: rawMaterialsTable.sourceId,
            set: {
              sourceSku: rawMaterialsTable.sourceSku,
            },
          })
          .returning({ sourceId: rawMaterialsTable.sourceId });
        // The first import sets both the public defaults and supplier snapshot.
        // On conflict, never overwrite merchant-edited name, description, price,
        // currency, category, image, or publish choice.
        for (const record of records) {
          const rowExists = existingIds.has(record.sourceId);
          if (!rowExists) continue;
          await tx.update(rawMaterialsTable).set({
            sourceSku: record.sourceSku,
            sourceName: record.sourceName, sourceDescription: record.sourceDescription,
            sourceCategory: record.sourceCategory, sourceImageUrl: record.sourceImageUrl,
            sourcePrice: record.sourcePrice, sourceCurrency: record.sourceCurrency,
            sourceAvailable: record.sourceAvailable, sourceUrl: record.sourceUrl,
            sourceUnit: record.sourceUnit, quantityOptions: record.quantityOptions,
          }).where(eq(rawMaterialsTable.sourceId, record.sourceId));
        }
      }
      const newCount = newlySeenIds.filter((sourceId) => !existingIds.has(sourceId)).length;
      const refreshedCount = newlySeenIds.filter((sourceId) => existingIds.has(sourceId)).length;
      const actualCreated = run.mode === "import" ? written.filter((record) => !existingIds.has(record.sourceId)).length : newCount;
      const actualUpdated = run.mode === "import" ? refreshedCount : refreshedCount;
      const errors = [
        ...run.errors.filter((item) => item.page !== page),
        ...Array.from({ length: unsupported }, () => ({
          page, url: pageUrl, message: "Skipped a supplier listing with a missing/invalid price, ID, source URL, or unsupported non-simple package.",
        })),
      ].slice(-250);
      const [updatedRun] = await tx.update(rawMaterialImportRunsTable).set({
        status: complete ? "complete" : failedPages.length ? "partial" : "running",
        nextPage, totalPages: result.totalPages,
        discovered: sourceIds.size, created: run.created + actualCreated,
        updated: run.updated + actualUpdated,
        skipped: run.skipped + unsupported, processed: run.processed + result.products.length,
        sourceIds: [...sourceIds], categories: [...categories].sort(),
        processedPages: completedPages, failedPages, errors,
        leaseToken: null, leaseUntil: null, updatedAt,
        completedAt: complete ? updatedAt : null,
      }).where(and(eq(rawMaterialImportRunsTable.id, id), eq(rawMaterialImportRunsTable.leaseToken, lease)))
        .returning();
      return [updatedRun];
    });
    if (!saved) { res.status(409).json({ error: "Import progress changed. Reload the saved run before resuming." }); return; }
    req.log.info({
      runId: id, mode: saved.mode, page, imported: saved.created,
      refreshed: saved.updated, skipped: unsupported, complete: saved.status === "complete",
    }, "Raw material import page completed");
    res.json(GetRawMaterialImportResponse.parse(importJob(saved)));
  } catch (error) {
    const reason = error instanceof HillenError ? error.message : "This page could not be saved; retrying it will not change merchant prices.";
    const failures = [...new Set([...run.failedPages, page])].sort((a, b) => a - b);
    const [saved] = await db.update(rawMaterialImportRunsTable).set({
      status: "partial", nextPage, totalPages: run.totalPages, failedPages: failures,
      errors: [...run.errors.filter((item) => item.page !== page),
        { page, url: pageUrl, message: reason }].slice(-250),
      leaseToken: null, leaseUntil: null, updatedAt: new Date(), completedAt: null,
    }).where(and(eq(rawMaterialImportRunsTable.id, id), eq(rawMaterialImportRunsTable.leaseToken, lease))).returning();
    req.log.warn({ runId: id, page, reason }, "Raw material import page failed and was recorded for retry");
    if (saved) { res.json(GetRawMaterialImportResponse.parse(importJob(saved))); return; }
    res.status(502).json({ error: reason });
  }
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

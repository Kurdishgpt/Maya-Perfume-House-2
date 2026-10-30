import { enforceRateLimit } from "../lib/rateLimit";
import { asc, desc, eq, inArray, and, isNull, lt, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { db, rawMaterialImportRunsTable, rawMaterialsTable } from "@workspace/db";
import {
  AddHillenRawMaterialBody, AddHillenRawMaterialResponse,
  CreateRawMaterialImportBody, CreateRawMaterialImportResponse, DeleteRawMaterialParams,
  GetRawMaterialImportParams, GetRawMaterialImportResponse,
  ListHillenRawMaterialCategoriesResponse, ListRawMaterialImportsResponse,
  ListAdminRawMaterialsResponse, ListRawMaterialsResponse,
  ResearchRawMaterialsBody, ResearchRawMaterialsResponse,
  UpdateRawMaterialBody, UpdateRawMaterialParams, UpdateRawMaterialResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/requireAdmin";
import { getStoreDatabase } from "../lib/storeDatabase";
import { fetchHillenCategories, fetchHillenMaterial, fetchHillenPage, HillenError, hillenUrl, parseHillenMaterial, searchHillenMaterials, unsupportedHillenReason, type HillenMaterial } from "../lib/hillenCatalog";
import { explainRawMaterials } from "../lib/rawMaterialAi";

const router: IRouter = Router();

type StoreMaterialRow = {
  id: string;
  legacy_id: number;
  source_id: number;
  source_sku: string | null;
  source_name: string | null;
  source_description: string | null;
  source_category: string | null;
  source_image_url: string | null;
  source_available: boolean | null;
  raw_material_category: string | null;
  name: string;
  description: string;
  price: number | string;
  currency: "USD" | "IQD";
  source_price: number | string | null;
  source_currency: "USD" | "IQD" | null;
  image_url: string;
  source_url: string | null;
  supplier_available: boolean | null;
  is_active: boolean;
  source_unit: "g" | "item" | null;
  quantity_options: unknown;
  imported_at: string | null;
  created_at: string;
};

function storeApi(row: StoreMaterialRow) {
  return {
    id: Number(row.legacy_id),
    supabase_id: row.id,
    source_id: row.source_id,
    name: row.name,
    description: row.description,
    source_sku: row.source_sku ?? "",
    source_description: row.source_description ?? "",
    source_name: row.source_name ?? "",
    source_category: row.source_category ?? "",
    source_image_url: row.source_image_url ?? "",
    source_available: row.source_available ?? false,
    category: row.raw_material_category ?? row.source_category ?? "Other",
    price: Number(row.price),
    currency: row.currency,
    source_price: Number(row.source_price ?? row.price),
    source_currency: row.source_currency ?? row.currency,
    image_url: row.image_url,
    source_url: row.source_url ?? "",
    supplier_available: row.supplier_available ?? false,
    published: row.is_active,
    unit: row.source_unit ?? "item",
    quantity_options: Array.isArray(row.quantity_options) ? row.quantity_options : [],
    imported_at: new Date(row.imported_at ?? row.created_at).toISOString(),
  };
}

function supplierProductValues(material: HillenMaterial) {
  const image = material.image_url ?? "";
  return {
    name: material.name,
    slug: `hillen-${material.source_id}-${material.name}`
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 550),
    description: material.description,
    brand: "",
    category: "raw_materials",
    product_type: "raw_material",
    price: material.price,
    currency: material.currency,
    image_url: image,
    additional_images: image ? [image] : [],
    size_ml: null,
    stock_quantity: 0,
    sku: null,
    is_active: true,
    source_id: material.source_id,
    source_sku: material.source_sku,
    source_name: material.name,
    source_description: material.source_description,
    source_category: material.source_category,
    source_image_url: image,
    raw_material_category: material.category,
    source_price: material.price,
    source_currency: material.currency,
    source_url: material.source_url,
    source_unit: material.unit,
    quantity_options: material.quantity_options,
    supplier_available: material.supplier_available,
    source_available: material.supplier_available,
    imported_at: new Date().toISOString(),
  };
}

async function saveSupplierMaterial(material: HillenMaterial): Promise<StoreMaterialRow> {
  const storeDatabase = getStoreDatabase();
  const fields = supplierProductValues(material);
  const { data: existing, error: findError } = await storeDatabase
    .from("products")
    .select("*")
    .eq("source_id", material.source_id)
    .maybeSingle();
  if (findError) throw new Error("Could not check the existing Netlify Database catalog item.");

  if (existing) {
    const { data, error } = await storeDatabase
      .from("products")
      .update({
        source_sku: fields.source_sku,
        source_name: fields.source_name,
        source_description: fields.source_description,
        source_category: fields.source_category,
        source_image_url: fields.source_image_url,
        source_price: fields.source_price,
        source_currency: fields.source_currency,
        source_url: fields.source_url,
        source_unit: fields.source_unit,
        quantity_options: fields.quantity_options,
        supplier_available: fields.supplier_available,
        source_available: fields.source_available,
        imported_at: fields.imported_at,
      })
      .eq("source_id", material.source_id)
      .select("*")
      .single();
    if (error || !data) throw new Error("Could not refresh supplier details in Netlify Database.");
    return data as StoreMaterialRow;
  }

  const { data, error } = await storeDatabase
    .from("products")
    .insert(fields)
    .select("*")
    .single();
  if (error || !data) throw new Error("Could not save the raw material to Netlify Database.");
  return data as StoreMaterialRow;
}
function values(material: HillenMaterial) {
  return {
    sourceId: material.source_id, sourceSku: material.source_sku, name: material.name,
    sourceName: material.name, sourceDescription: material.source_description,
    sourceCategory: material.source_category, sourceImageUrl: material.image_url,
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

router.get("/raw-materials", async (req, res): Promise<void> => {
  
  try {
    const { data, error } = await getStoreDatabase()
      .from("products")
      .select("*")
      .eq("product_type", "raw_material")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) {
      req.log.error({ code: error.code }, "Netlify Database raw-material catalog read failed");
      res.status(503).json({ error: "Raw materials are temporarily unavailable." });
      return;
    }
    res.setHeader("X-Maya-Catalog-Source", "netlify-database");
    res.json(ListRawMaterialsResponse.parse((data as StoreMaterialRow[]).map(storeApi)));
  } catch (error) {
    req.log.error({ err: error }, "Netlify Database raw-material request failed");
    res.status(503).json({ error: "Raw materials are temporarily unavailable." });
  }
});

router.use("/admin/raw-materials", requireAdmin, async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET" || req.method === "PATCH" || req.method === "DELETE") { next(); return; }
  if (!await enforceRateLimit(req, res, "supplier", 40, 60_000)) return;
  next();
});

router.get("/admin/raw-materials", async (req, res): Promise<void> => {
  
  try {
    const { data, error } = await getStoreDatabase()
      .from("products")
      .select("*")
      .eq("product_type", "raw_material")
      .order("name", { ascending: true });
    if (error) {
      req.log.error({ code: error.code }, "Netlify Database admin raw-material read failed");
      res.status(503).json({ error: "Saved raw materials are temporarily unavailable." });
      return;
    }
    res.setHeader("X-Maya-Catalog-Source", "netlify-database");
    res.json(ListAdminRawMaterialsResponse.parse((data as StoreMaterialRow[]).map(storeApi)));
  } catch (error) {
    req.log.error({ err: error }, "Netlify Database admin raw-material request failed");
    res.status(503).json({ error: "Saved raw materials are temporarily unavailable." });
  }
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
  if (input.data.mode === "import") {
    const [preview] = input.data.dry_run_id
      ? await db.select().from(rawMaterialImportRunsTable).where(eq(rawMaterialImportRunsTable.id, input.data.dry_run_id))
      : [];
    const categoryMatches = preview?.categoryId === categoryId;
    const reviewFresh = preview?.completedAt && Date.now() - preview.completedAt.getTime() < 12 * 60 * 60 * 1000;
    if (!preview || preview.mode !== "dry-run" || preview.status !== "complete" || !categoryMatches || !reviewFresh) {
      res.status(400).json({ error: "Complete and review a fresh dry run for this category before importing." });
      return;
    }
  }
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
    if (run.mode === "import") {
      for (const material of pageMaterials) await saveSupplierMaterial(material);
    }
    const pageIds = pageMaterials.map((material) => material.source_id);
    const existingRows = pageIds.length
      ? await db.select({ sourceId: rawMaterialsTable.sourceId }).from(rawMaterialsTable)
          .where(inArray(rawMaterialsTable.sourceId, pageIds))
      : [];
    const existingIds = new Set(existingRows.map((row) => row.sourceId));
    const sourceIds = new Set([...run.sourceIds, ...pageIds]);
    const categories = new Set([...run.categories, ...pageMaterials.flatMap((item) => item.source_category.split(" / ").map((name) => name.trim()).filter(Boolean))]);
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
          .returning();
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
        ...entries.flatMap((entry, index) => {
          if (entry) return [];
          const product = result.products[index] as { id?: unknown; name?: unknown; permalink?: unknown };
          const id = Number.isSafeInteger(product?.id) ? product.id : null;
          const name = typeof product?.name === "string" ? product.name.replace(/<[^>]*>/g, "").slice(0, 100) : "";
          const sourceUrl = hillenUrl(product?.permalink) || pageUrl;
          return [{
            page, url: sourceUrl,
            message: `Skipped Hillen99${id === null ? "" : ` #${id}`}${name ? ` (${name})` : ""}: ${unsupportedHillenReason(product)}.`,
          }];
        }),
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
      status: "partial", nextPage: run.nextPage, totalPages: run.totalPages, failedPages: failures,
      errors: [...run.errors.filter((item) => item.page !== page),
        { page, url: pageUrl, message: reason }].slice(-250),
      leaseToken: null, leaseUntil: null, updatedAt: new Date(), completedAt: null,
    }).where(and(eq(rawMaterialImportRunsTable.id, id), eq(rawMaterialImportRunsTable.leaseToken, lease))).returning();
    req.log.warn({ runId: id, page, reason }, "Raw material import page failed and was recorded for retry");
    if (saved) { res.json(GetRawMaterialImportResponse.parse(importJob(saved))); return; }
    res.status(502).json({ error: reason });
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
    const { data: existingStore, error: existingError } = await getStoreDatabase()
      .from("products").select("*").eq("source_id", input.data.source_id).maybeSingle();
    if (existingError) throw new Error("Could not check the saved Netlify Database material.");
    if (existingStore) {
      res.json(AddHillenRawMaterialResponse.parse(storeApi(existingStore as StoreMaterialRow)));
      return;
    }
    const [existingLegacy] = await db.select().from(rawMaterialsTable).where(eq(rawMaterialsTable.sourceId, input.data.source_id));
    const { material } = await fetchHillenMaterial(input.data.source_id);
    await db.insert(rawMaterialsTable).values(values(material)).onConflictDoNothing({ target: rawMaterialsTable.sourceId });
    let saved = await saveSupplierMaterial(material);
    if (existingLegacy) {
      const { data: edited, error } = await getStoreDatabase()
        .from("products")
        .update({
          name: existingLegacy.name,
          description: existingLegacy.description,
          raw_material_category: existingLegacy.category,
          price: existingLegacy.price,
          currency: existingLegacy.currency,
          image_url: existingLegacy.imageUrl,
          is_active: existingLegacy.published,
        })
        .eq("source_id", input.data.source_id)
        .select("*")
        .single();
      if (error || !edited) throw new Error("Could not preserve the existing merchant-edited material.");
      saved = edited as StoreMaterialRow;
    }
    res.json(AddHillenRawMaterialResponse.parse(storeApi(saved)));
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
  const values: Record<string, unknown> = {};
  if (data.name !== undefined) values.name = data.name.trim();
  if (data.description !== undefined) values.description = data.description;
  if (data.category !== undefined) values.raw_material_category = data.category.trim();
  if (data.price !== undefined) values.price = data.price;
  if (data.currency !== undefined) values.currency = data.currency;
  if (data.published !== undefined) values.is_active = data.published;

  try {
    const { data: row, error } = await getStoreDatabase()
      .from("products")
      .update(values)
      .eq("legacy_id", params.data.id)
      .eq("product_type", "raw_material")
      .select("*")
      .maybeSingle();
    if (error) {
      req.log.error({ code: error.code }, "Netlify Database raw-material update failed");
      res.status(503).json({ error: "The material could not be updated in the catalog." });
      return;
    }
    if (!row) { res.status(404).json({ error: "Material not found." }); return; }
    res.json(UpdateRawMaterialResponse.parse(storeApi(row as StoreMaterialRow)));
  } catch (error) {
    req.log.error({ err: error }, "Netlify Database raw-material update failed");
    res.status(503).json({ error: "The material could not be updated in the catalog." });
  }
});

router.delete("/admin/raw-materials/:id", async (req, res): Promise<void> => {
  const params = DeleteRawMaterialParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid material ID." }); return; }
  try {
    const { data, error } = await getStoreDatabase()
      .from("products")
      .delete()
      .eq("legacy_id", params.data.id)
      .eq("product_type", "raw_material")
      .select("id")
      .maybeSingle();
    if (error) {
      req.log.error({ code: error.code }, "Netlify Database raw-material deletion failed");
      res.status(503).json({ error: "The material could not be removed from the catalog." });
      return;
    }
    if (!data) { res.status(404).json({ error: "Material not found." }); return; }
    res.sendStatus(204);
  } catch (error) {
    req.log.error({ err: error }, "Netlify Database raw-material deletion failed");
    res.status(503).json({ error: "The material could not be removed from the catalog." });
  }
});

export default router;

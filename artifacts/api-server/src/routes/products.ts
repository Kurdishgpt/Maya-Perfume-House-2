import { desc, eq } from "drizzle-orm";
import {
  CreateProductBody,
  CreateProductResponse,
  ListProductsResponse,
  UpdateProductBody,
  UpdateProductParams,
  UpdateProductResponse,
} from "@workspace/api-zod";
import { db, productsTable, type Product as DbProduct } from "@workspace/db";
import { Router, type IRouter } from "express";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

function toApiProduct(product: DbProduct) {
  return {
    id: product.id,
    title: product.title,
    brand: product.brand,
    price: product.price,
    stock: product.stock,
    sku: product.sku,
    category: product.category,
    description: product.description,
    top_notes: product.topNotes,
    heart_notes: product.heartNotes,
    base_notes: product.baseNotes,
    ingredients: product.ingredients,
    image_url: product.imageUrl,
    created_at: product.createdAt.toISOString(),
  };
}

function isSkuConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

router.get("/products", async (_req, res): Promise<void> => {
  const products = await db
    .select()
    .from(productsTable)
    .orderBy(desc(productsTable.createdAt));
  res.json(ListProductsResponse.parse(products.map(toApiProduct)));
});

router.post("/products", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  try {
    const [product] = await db
      .insert(productsTable)
      .values({
        title: data.title.trim(),
        brand: data.brand.trim(),
        price: data.price,
        stock: data.stock,
        sku: data.sku.trim(),
        category: data.category.trim(),
        description: data.description,
        topNotes: data.top_notes,
        heartNotes: data.heart_notes,
        baseNotes: data.base_notes,
        ingredients: data.ingredients,
        imageUrl: data.image_url,
      })
      .returning();

    if (!product) {
      res.status(500).json({ error: "The product could not be created." });
      return;
    }

    res.status(201).json(CreateProductResponse.parse(toApiProduct(product)));
  } catch (error) {
    if (isSkuConflict(error)) {
      res.status(409).json({ error: "That SKU is already in use." });
      return;
    }
    req.log.error({ err: error }, "Product creation failed");
    res.status(500).json({ error: "The product could not be created." });
  }
});

router.patch(
  "/products/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = UpdateProductParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid product ID." });
      return;
    }

    const parsed = UpdateProductBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const data = parsed.data;
    const values: Partial<typeof productsTable.$inferInsert> = {};
    if (data.title !== undefined) values.title = data.title.trim();
    if (data.brand !== undefined) values.brand = data.brand.trim();
    if (data.price !== undefined) values.price = data.price;
    if (data.stock !== undefined) values.stock = data.stock;
    if (data.sku !== undefined) values.sku = data.sku.trim();
    if (data.category !== undefined) values.category = data.category.trim();
    if (data.description !== undefined) values.description = data.description;
    if (data.top_notes !== undefined) values.topNotes = data.top_notes;
    if (data.heart_notes !== undefined) values.heartNotes = data.heart_notes;
    if (data.base_notes !== undefined) values.baseNotes = data.base_notes;
    if (data.ingredients !== undefined) values.ingredients = data.ingredients;
    if (data.image_url !== undefined) values.imageUrl = data.image_url;

    if (Object.keys(values).length === 0) {
      res.status(400).json({ error: "Add at least one field to update." });
      return;
    }

    try {
      const [product] = await db
        .update(productsTable)
        .set(values)
        .where(eq(productsTable.id, params.data.id))
        .returning();

      if (!product) {
        res.status(404).json({ error: "Product not found." });
        return;
      }

      res.json(UpdateProductResponse.parse(toApiProduct(product)));
    } catch (error) {
      if (isSkuConflict(error)) {
        res.status(409).json({ error: "That SKU is already in use." });
        return;
      }
      req.log.error({ err: error }, "Product update failed");
      res.status(500).json({ error: "The product could not be updated." });
    }
  },
);

router.delete(
  "/products/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = UpdateProductParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid product ID." });
      return;
    }

    const [deleted] = await db
      .delete(productsTable)
      .where(eq(productsTable.id, params.data.id))
      .returning({ id: productsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    res.sendStatus(204);
  },
);

export default router;

import { integer, numeric, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const productsTable = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    brand: text("brand").notNull(),
    price: numeric("price", { precision: 10, scale: 2, mode: "number" }).notNull(),
    currency: text("currency").notNull().default("USD"),
    bottleSizeMl: integer("bottle_size_ml"),
    stock: integer("stock").notNull().default(0),
    sku: text("sku").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull().default(""),
    topNotes: text("top_notes").array().notNull().default([]),
    heartNotes: text("heart_notes").array().notNull().default([]),
    baseNotes: text("base_notes").array().notNull().default([]),
    ingredients: text("ingredients").array().notNull().default([]),
    imageUrl: text("image_url").notNull().default(""),
    galleryImages: text("gallery_images").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("products_sku_unique").on(table.sku)],
);


export type InsertProduct = typeof productsTable.$inferInsert;
export type Product = typeof productsTable.$inferSelect;

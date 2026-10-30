import { boolean, integer, numeric, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// Separate from perfume products: prices are per gram, not per bottle.
export const rawMaterialsTable = pgTable("raw_materials", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("Raw Material"),
  price: numeric("price", { precision: 12, scale: 4, mode: "number" }).notNull(),
  currency: text("currency").notNull().default("USD"),
  sourcePrice: numeric("source_price", { precision: 12, scale: 4, mode: "number" }).notNull(),
  sourceCurrency: text("source_currency").notNull().default("USD"),
  imageUrl: text("image_url").notNull().default(""),
  sourceUrl: text("source_url").notNull(),
  supplierAvailable: boolean("supplier_available").notNull().default(false),
  published: boolean("published").notNull().default(true),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("raw_materials_hillen_source_unique").on(table.sourceId)]);

import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

const money = (name: string) => numeric(name, { precision: 14, scale: 4, mode: "number" });
const date = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });

// UUIDs identify checkout products; legacy_id preserves existing storefront URLs.
export const storeProducts = pgTable("store_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  legacy_id: serial("legacy_id").notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  brand: text("brand").notNull().default(""),
  category: text("category").notNull(),
  product_type: text("product_type").notNull(),
  price: money("price").notNull(),
  compare_at_price: money("compare_at_price"),
  currency: text("currency").notNull().default("USD"),
  image_url: text("image_url").notNull().default(""),
  additional_images: text("additional_images").array().notNull().default([]),
  scent_family: text("scent_family"),
  top_notes: text("top_notes").array().notNull().default([]),
  middle_notes: text("middle_notes").array().notNull().default([]),
  base_notes: text("base_notes").array().notNull().default([]),
  ingredients: text("ingredients").array().notNull().default([]),
  size_ml: integer("size_ml"),
  stock_quantity: integer("stock_quantity").notNull().default(0),
  sku: text("sku"),
  is_active: boolean("is_active").notNull().default(false),
  is_featured: boolean("is_featured").notNull().default(false),
  is_new_arrival: boolean("is_new_arrival").notNull().default(false),
  source_id: integer("source_id").unique(),
  source_sku: text("source_sku"),
  source_name: text("source_name"),
  source_description: text("source_description"),
  source_category: text("source_category"),
  source_image_url: text("source_image_url"),
  raw_material_category: text("raw_material_category"),
  source_price: money("source_price"),
  source_currency: text("source_currency"),
  source_url: text("source_url"),
  source_unit: text("source_unit"),
  quantity_options: jsonb("quantity_options").notNull().default([]),
  supplier_available: boolean("supplier_available"),
  source_available: boolean("source_available"),
  imported_at: date("imported_at"),
  created_at: date("created_at").notNull().defaultNow(),
  updated_at: date("updated_at").notNull().defaultNow(),
}, t => [
  uniqueIndex("store_products_sku_unique").on(t.sku).where(sql`${t.sku} is not null and length(trim(${t.sku})) > 0`),
  index("store_products_catalog_idx").on(t.is_active, t.product_type, t.created_at),
  check("store_products_price_valid", sql`${t.price} >= 0`),
  check("store_products_stock_valid", sql`${t.stock_quantity} >= 0`),
  check("store_products_currency_valid", sql`${t.currency} in ('USD', 'IQD')`),
  check("store_products_type_valid", sql`${t.product_type} in ('perfume', 'raw_material')`),
  check("store_products_category_valid", sql`${t.category} in ('women', 'men', 'unisex', 'raw_materials')`),
]);

export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  store_hours: text("store_hours").notNull().default("9:00 AM – 6:00 PM"),
  shipping_fee_usd: money("shipping_fee_usd").notNull().default(0),
  shipping_fee_iqd: money("shipping_fee_iqd").notNull().default(0),
  updated_at: date("updated_at").notNull().defaultNow(),
}, t => [check("site_settings_singleton", sql`${t.id} = 1`), check("shipping_fees_valid", sql`${t.shipping_fee_usd} >= 0 and ${t.shipping_fee_iqd} >= 0`)]);

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  guest_token_hash: text("guest_token_hash").notNull().unique(),
  status: text("status").notNull().default("active"),
  created_at: date("created_at").notNull().defaultNow(),
  updated_at: date("updated_at").notNull().defaultNow(),
});
export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  cart_id: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  product_id: uuid("product_id").notNull().references(() => storeProducts.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  created_at: date("created_at").notNull().defaultNow(),
  updated_at: date("updated_at").notNull().defaultNow(),
}, t => [uniqueIndex("cart_items_cart_product_unique").on(t.cart_id, t.product_id), check("cart_quantity_valid", sql`${t.quantity} between 1 and 10000`)]);
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  guest_access_token_hash: text("guest_access_token_hash").notNull(),
  customer_name: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  shipping_address: text("shipping_address").notNull(),
  city: text("city").notNull(),
  subtotal: money("subtotal").notNull(),
  shipping_fee: money("shipping_fee").notNull().default(0),
  total: money("total").notNull(),
  currency: text("currency").notNull(),
  payment_method: text("payment_method").notNull().default("whatsapp"),
  payment_status: text("payment_status").notNull().default("pending"),
  order_status: text("order_status").notNull().default("pending_confirmation"),
  notes: text("notes").notNull().default(""),
  created_at: date("created_at").notNull().defaultNow(),
  updated_at: date("updated_at").notNull().defaultNow(),
}, t => [check("orders_totals_valid", sql`${t.subtotal} >= 0 and ${t.shipping_fee} >= 0 and ${t.total} = ${t.subtotal} + ${t.shipping_fee}`), check("orders_currency_valid", sql`${t.currency} in ('USD', 'IQD')`)]);
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  order_id: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  product_id: uuid("product_id").references(() => storeProducts.id, { onDelete: "set null" }),
  product_name: text("product_name").notNull(),
  product_image: text("product_image").notNull().default(""),
  unit_price: money("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
  line_total: money("line_total").notNull(),
}, t => [index("order_items_order_idx").on(t.order_id), check("order_items_quantity_valid", sql`${t.quantity} between 1 and 10000`)]);

export const requestLimits = pgTable("request_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(1),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, t => [index("request_limits_expiry_idx").on(t.expiresAt)]);

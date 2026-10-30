CREATE TABLE "raw_material_import_runs" (
	"id" serial PRIMARY KEY,
	"mode" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"category_id" integer,
	"category_name" text DEFAULT 'All categories' NOT NULL,
	"next_page" integer DEFAULT 1 NOT NULL,
	"total_pages" integer DEFAULT 0 NOT NULL,
	"discovered" integer DEFAULT 0 NOT NULL,
	"created" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"skipped" integer DEFAULT 0 NOT NULL,
	"processed" integer DEFAULT 0 NOT NULL,
	"source_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"processed_pages" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"failed_pages" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"errors" jsonb DEFAULT '[]' NOT NULL,
	"lease_token" text,
	"lease_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "raw_materials" (
	"id" serial PRIMARY KEY,
	"source_id" integer NOT NULL,
	"source_sku" text,
	"source_name" text NOT NULL,
	"source_description" text DEFAULT '' NOT NULL,
	"source_category" text DEFAULT 'Raw Material' NOT NULL,
	"source_image_url" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'Raw Material' NOT NULL,
	"price" numeric(12,4) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"source_price" numeric(12,4) NOT NULL,
	"source_currency" text DEFAULT 'USD' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"source_unit" text DEFAULT 'g' NOT NULL,
	"quantity_options" jsonb DEFAULT '[]' NOT NULL,
	"source_url" text NOT NULL,
	"supplier_available" boolean DEFAULT false NOT NULL,
	"source_available" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"brand" text NOT NULL,
	"price" numeric(10,2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"bottle_size_ml" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"sku" text NOT NULL,
	"category" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"top_notes" text[] DEFAULT '{}'::text[] NOT NULL,
	"heart_notes" text[] DEFAULT '{}'::text[] NOT NULL,
	"base_notes" text[] DEFAULT '{}'::text[] NOT NULL,
	"ingredients" text[] DEFAULT '{}'::text[] NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"gallery_images" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_contact_settings" (
	"id" integer PRIMARY KEY DEFAULT 1,
	"store_hours" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_quantity_valid" CHECK ("quantity" between 1 and 10000)
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"guest_token_hash" text NOT NULL UNIQUE,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name" text NOT NULL,
	"product_image" text DEFAULT '' NOT NULL,
	"unit_price" numeric(14,4) NOT NULL,
	"quantity" integer NOT NULL,
	"line_total" numeric(14,4) NOT NULL,
	CONSTRAINT "order_items_quantity_valid" CHECK ("quantity" between 1 and 10000)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"guest_access_token_hash" text NOT NULL,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"shipping_address" text NOT NULL,
	"city" text NOT NULL,
	"subtotal" numeric(14,4) NOT NULL,
	"shipping_fee" numeric(14,4) DEFAULT '0' NOT NULL,
	"total" numeric(14,4) NOT NULL,
	"currency" text NOT NULL,
	"payment_method" text DEFAULT 'whatsapp' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"order_status" text DEFAULT 'pending_confirmation' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_totals_valid" CHECK ("subtotal" >= 0 and "shipping_fee" >= 0 and "total" = "subtotal" + "shipping_fee"),
	CONSTRAINT "orders_currency_valid" CHECK ("currency" in ('USD', 'IQD'))
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" integer PRIMARY KEY DEFAULT 1,
	"store_hours" text DEFAULT '9:00 AM – 6:00 PM' NOT NULL,
	"shipping_fee_usd" numeric(14,4) DEFAULT '0' NOT NULL,
	"shipping_fee_iqd" numeric(14,4) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_singleton" CHECK ("id" = 1),
	CONSTRAINT "shipping_fees_valid" CHECK ("shipping_fee_usd" >= 0 and "shipping_fee_iqd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "store_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"legacy_id" serial UNIQUE,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"description" text DEFAULT '' NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"product_type" text NOT NULL,
	"price" numeric(14,4) NOT NULL,
	"compare_at_price" numeric(14,4),
	"currency" text DEFAULT 'USD' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"additional_images" text[] DEFAULT '{}'::text[] NOT NULL,
	"scent_family" text,
	"top_notes" text[] DEFAULT '{}'::text[] NOT NULL,
	"middle_notes" text[] DEFAULT '{}'::text[] NOT NULL,
	"base_notes" text[] DEFAULT '{}'::text[] NOT NULL,
	"ingredients" text[] DEFAULT '{}'::text[] NOT NULL,
	"size_ml" integer,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"sku" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_new_arrival" boolean DEFAULT false NOT NULL,
	"source_id" integer UNIQUE,
	"source_sku" text,
	"source_name" text,
	"source_description" text,
	"source_category" text,
	"source_image_url" text,
	"raw_material_category" text,
	"source_price" numeric(14,4),
	"source_currency" text,
	"source_url" text,
	"source_unit" text,
	"quantity_options" jsonb DEFAULT '[]' NOT NULL,
	"supplier_available" boolean,
	"source_available" boolean,
	"imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_products_price_valid" CHECK ("price" >= 0),
	CONSTRAINT "store_products_stock_valid" CHECK ("stock_quantity" >= 0),
	CONSTRAINT "store_products_currency_valid" CHECK ("currency" in ('USD', 'IQD')),
	CONSTRAINT "store_products_type_valid" CHECK ("product_type" in ('perfume', 'raw_material')),
	CONSTRAINT "store_products_category_valid" CHECK ("category" in ('women', 'men', 'unisex', 'raw_materials'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "raw_materials_hillen_source_unique" ON "raw_materials" ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_unique" ON "products" ("sku");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_product_unique" ON "cart_items" ("cart_id","product_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_products_sku_unique" ON "store_products" ("sku") WHERE "sku" is not null and length(trim("sku")) > 0;--> statement-breakpoint
CREATE INDEX "store_products_catalog_idx" ON "store_products" ("is_active","product_type","created_at");--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_store_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "store_products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_store_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "store_products"("id") ON DELETE SET NULL;
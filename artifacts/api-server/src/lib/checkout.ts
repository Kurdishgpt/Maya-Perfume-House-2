import { asc, eq, inArray, sql } from "drizzle-orm";
import { db, storeProducts, siteSettings, orders, orderItems } from "@workspace/db";

export type CheckoutInput = {
  customer_name: string; phone: string; email?: string | null;
  shipping_address: string; city: string; notes?: string; payment_method: string;
};
export type CheckoutItem = { product_id: string; quantity: number };
const units = (value: number) => BigInt(value.toFixed(4).replace(".", ""));
const amount = (value: bigint) => Number(value) / 10000;

export async function createStoreOrder(input: CheckoutInput, items: CheckoutItem[], guestHash: string): Promise<string> {
  return db.transaction(async tx => {
    // Lock in a stable order so concurrent checkouts cannot oversell or deadlock.
    const products = await tx.select().from(storeProducts)
      .where(inArray(storeProducts.id, items.map(item => item.product_id)))
      .orderBy(asc(storeProducts.id)).for("update");
    if (!items.length || products.length !== items.length) throw new Error("PRODUCT_UNAVAILABLE");
    const quantities = new Map(items.map(item => [item.product_id, item.quantity]));
    const currency = products[0].currency;
    let subtotal = 0n;
    for (const product of products) {
      const quantity = quantities.get(product.id)!;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error("PRODUCT_UNAVAILABLE");
      if (!product.is_active || (product.product_type === "raw_material" && !product.supplier_available)) throw new Error("PRODUCT_UNAVAILABLE");
      if (product.currency !== currency) throw new Error("MIXED_CURRENCIES");
      if (product.product_type === "perfume" && product.stock_quantity < quantity) throw new Error("INSUFFICIENT_STOCK");
      subtotal += units(product.price) * BigInt(quantity);
    }
    const [settings] = await tx.select().from(siteSettings).where(eq(siteSettings.id, 1));
    const shipping = units(currency === "USD" ? settings?.shipping_fee_usd ?? 0 : settings?.shipping_fee_iqd ?? 0);
    const [order] = await tx.insert(orders).values({
      guest_access_token_hash: guestHash,
      customer_name: input.customer_name.trim(), phone: input.phone.trim(), email: input.email?.trim() || null,
      shipping_address: input.shipping_address.trim(), city: input.city.trim(), notes: input.notes ?? "",
      payment_method: input.payment_method, currency,
      subtotal: amount(subtotal), shipping_fee: amount(shipping), total: amount(subtotal + shipping),
    }).returning();
    for (const product of products) {
      const quantity = quantities.get(product.id)!;
      if (product.product_type === "perfume") {
        await tx.update(storeProducts).set({ stock_quantity: sql`${storeProducts.stock_quantity} - ${quantity}`, updated_at: new Date().toISOString() })
          .where(eq(storeProducts.id, product.id));
      }
      await tx.insert(orderItems).values({
        order_id: order.id, product_id: product.id, product_name: product.name, product_image: product.image_url,
        unit_price: product.price, quantity, line_total: amount(units(product.price) * BigInt(quantity)),
      });
    }
    return order.id;
  });
}

export const HILLEN_ORIGIN = "https://hillen99.com";
export const HILLEN_PAGE_SIZE = 50;

export type HillenMaterial = {
  source_id: number; name: string; description: string; category: string;
  price: number; currency: "USD" | "IQD"; image_url: string;
  source_url: string; supplier_available: boolean;
};
type SupplierProduct = {
  id?: number; name?: string; type?: string; slug?: string; permalink?: string;
  description?: string; short_description?: string; is_in_stock?: boolean;
  prices?: { price?: string; currency_code?: string; currency_minor_unit?: number; price_range?: unknown };
  categories?: Array<{ name?: string }>; images?: Array<{ src?: string }>;
};

export function plainText(html: string) {
  return html.replace(/<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, "")
    .split(/<div\b[^>]*class=["'][^"']*tinv/i)[0]
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_match, code: string) => {
      const n = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
    })
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|ndash|mdash|rsquo|lsquo|rdquo|ldquo);/g, (entity) => ({
      "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&nbsp;": " ",
      "&ndash;": "–", "&mdash;": "—", "&rsquo;": "'", "&lsquo;": "'", "&rdquo;": '"', "&ldquo;": '"',
    })[entity] ?? "")
    .replace(/\s+/g, " ").trim();
}

export function hillenUrl(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["hillen99.com", "www.hillen99.com"].includes(url.hostname)
      && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

export function parseHillenMaterial(value: unknown): { material: HillenMaterial; evidence: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const product = value as SupplierProduct;
  const price = product.prices;
  if (!Number.isSafeInteger(product.id) || product.id! <= 0 || typeof product.name !== "string" ||
      product.type !== "simple" || !price || typeof price.price !== "string" || !/^\d+$/.test(price.price) ||
      !Number.isInteger(price.currency_minor_unit) || price.currency_minor_unit! < 0 || price.currency_minor_unit! > 6 ||
      !["USD", "IQD"].includes(price.currency_code ?? "") || price.price_range != null) return null;
  // Equipment/bundles are not per-gram raw materials.
  if (/\b(kit|bundle|bag|pipette|scale|bottles?)\b|حقيبة|مجموعة أدوات/i.test(`${product.name} ${product.slug ?? ""}`)) return null;
  const amount = Number(price.price) / 10 ** price.currency_minor_unit!;
  const sourceUrl = hillenUrl(product.permalink);
  if (!Number.isFinite(amount) || amount < 0 || amount > 99999999 || !sourceUrl) return null;
  const name = plainText(product.name).slice(0, 500);
  if (!name) return null;
  const category = (Array.isArray(product.categories) ? product.categories
    .map((c) => plainText(typeof c.name === "string" ? c.name : ""))
    .filter((name) => name && name !== ".").join(" / ") : "").slice(0, 150) || "Raw Material";
  const evidence = plainText(typeof product.description === "string" ? product.description : "").slice(0, 1800);
  const cas = evidence.match(/\b\d{2,7}-\d{2}-\d\b/)?.[0];
  return {
    material: {
      source_id: product.id!, name, category, price: amount, currency: price.currency_code as "USD" | "IQD",
      // Original factual copy, not wholesale republication of supplier marketing text.
      description: `${name} — ${category} perfumery material listed by Hillen99.${cas ? ` CAS: ${cas}.` : ""} Consult the supplier documentation before use.`,
      image_url: hillenUrl(Array.isArray(product.images) ? product.images[0]?.src : ""),
      source_url: sourceUrl, supplier_available: product.is_in_stock === true,
    },
    evidence,
  };
}

export class HillenError extends Error {}

async function supplierRequest(path: string, fetcher: typeof fetch = fetch) {
  try {
    const response = await fetcher(`${HILLEN_ORIGIN}/wp-json/wc/store/v1/${path}`, {
      headers: { Accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new HillenError(response.status === 429
        ? "Hillen99 is limiting requests. Please wait before retrying."
        : "Hillen99 could not provide the catalog. Please retry; already imported pages are saved.");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new HillenError("Hillen99 returned an empty response.");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 3_000_000) {
        await reader.cancel();
        throw new HillenError("The supplier response is too large. Please try again later.");
      }
      chunks.push(chunk.value);
    }
    const data: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return { data, headers: response.headers };
  } catch (error) {
    if (error instanceof HillenError) throw error;
    throw new HillenError("The Hillen99 connection timed out or was interrupted. Please retry; existing imports are preserved.");
  }
}

export async function fetchHillenPage(page: number) {
  const { data, headers } = await supplierRequest(`products?per_page=${HILLEN_PAGE_SIZE}&page=${page}&orderby=id&order=asc`);
  const total = Number(headers.get("x-wp-total"));
  const totalPages = Number(headers.get("x-wp-totalpages"));
  if (!Array.isArray(data) || !Number.isSafeInteger(total) || total < 0 ||
      !Number.isSafeInteger(totalPages) || totalPages < 1 || totalPages > 1000) {
    throw new HillenError("Hillen99 returned an incomplete catalog page. Import stopped without changing saved items.");
  }
  return { products: data, total, totalPages };
}

export async function fetchHillenMaterial(id: number) {
  const { data } = await supplierRequest(`products/${id}`);
  const parsed = parseHillenMaterial(data);
  if (!parsed || parsed.material.source_id !== id) throw new HillenError("This supplier item is not a supported per-gram raw material.");
  return parsed;
}

export async function searchHillenMaterials(query: string) {
  const { data } = await supplierRequest(`products?${new URLSearchParams({ per_page: "12", search: query })}`);
  if (!Array.isArray(data)) throw new HillenError("Hillen99 returned invalid search results.");
  return data.map(parseHillenMaterial).filter((item): item is NonNullable<typeof item> => item !== null);
}

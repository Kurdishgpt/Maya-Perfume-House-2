import { and, asc, desc, eq, getTableColumns, inArray, notInArray, sql, type SQL } from "drizzle-orm";
import { db, storeProducts, siteSettings, carts, cartItems, orders, orderItems } from "@workspace/db";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";

const tables = { products: storeProducts, site_settings: siteSettings, carts, cart_items: cartItems, orders, order_items: orderItems };
// The server API uses database column names. Keep its response contract while
// executing all queries through Drizzle and the native Netlify Database adapter.
type Row = Record<string, any>;
type Result<T> = { data: T | null; error: { code?: string; message: string } | null };

export class StoreQuery implements PromiseLike<Result<Row[]>> {
  private table: PgTable;
  private columns: Record<string, AnyPgColumn>;
  private filters: SQL[] = [];
  private sorting: SQL[] = [];
  private fields = "*";
  private action: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private values: Row[] = [];
  private conflict = "id";
  private rowLimit?: number;
  private offset = 0;

  constructor(name: keyof typeof tables, private database: Pick<typeof db, "select" | "insert" | "update" | "delete"> = db) {
    this.table = tables[name];
    this.columns = getTableColumns(this.table);
  }
  private column(name: string) {
    const column = this.columns[name];
    if (!column) throw new Error("Unknown store column");
    return column;
  }
  select(fields = "*") { this.fields = fields; return this; }
  eq(name: string, value: unknown) { this.filters.push(eq(this.column(name), value)); return this; }
  in(name: string, values: unknown[]) { this.filters.push(inArray(this.column(name), values)); return this; }
  notIn(name: string, values: unknown[]) { this.filters.push(notInArray(this.column(name), values)); return this; }
  order(name: string, options: { ascending?: boolean } = {}) {
    this.sorting.push(options.ascending === false ? desc(this.column(name)) : asc(this.column(name))); return this;
  }
  limit(value: number) { this.rowLimit = value; return this; }
  range(from: number, to: number) { this.offset = from; this.rowLimit = to - from + 1; return this; }
  insert(value: Row | Row[]) { this.action = "insert"; this.values = Array.isArray(value) ? value : [value]; return this; }
  update(value: Row) { this.action = "update"; this.values = [value]; return this; }
  delete() { this.action = "delete"; return this; }
  upsert(value: Row | Row[], options: { onConflict: string }) {
    this.insert(value); this.action = "upsert"; this.conflict = options.onConflict; return this;
  }
  private selection() {
    if (this.fields === "*") return this.columns;
    return Object.fromEntries(this.fields.split(",").map(name => [name.trim(), this.column(name.trim())]));
  }
  async execute(): Promise<Result<Row[]>> {
    try {
      const selected = this.selection();
      let query: any;
      if (this.action === "select") {
        query = this.database.select(selected).from(this.table).where(and(...this.filters)).$dynamic();
        if (this.sorting.length) query = query.orderBy(...this.sorting);
        if (this.rowLimit !== undefined) query = query.limit(this.rowLimit);
        if (this.offset) query = query.offset(this.offset);
      } else if (this.action === "delete") {
        if (!this.filters.length) throw new Error("Unfiltered store deletion rejected");
        query = this.database.delete(this.table).where(and(...this.filters)).returning();
      } else {
        // Reject unknown input keys rather than silently dropping catalog fields.
        for (const value of this.values) for (const name of Object.keys(value)) this.column(name);
        if (this.action === "update") {
          if (!this.filters.length) throw new Error("Unfiltered store update rejected");
          const value = { ...this.values[0] };
          if (this.columns.updated_at) value.updated_at = new Date().toISOString();
          query = this.database.update(this.table).set(value).where(and(...this.filters)).returning();
        } else {
          query = this.database.insert(this.table).values(this.values);
          if (this.action === "upsert") {
            const update = Object.fromEntries(Object.keys(this.values[0]).filter(key => !["id", "legacy_id", "created_at"].includes(key))
              .map(key => [key, sql`excluded.${sql.identifier(this.column(key).name)}`]));
            if (this.columns.updated_at) update.updated_at = sql`now()`;
            query = query.onConflictDoUpdate({ target: this.conflict.split(",").map(key => this.column(key.trim())), set: update });
          }
          query = query.returning();
        }
      }
      const rows: Row[] = await query;
      const data = this.action === "select" || this.fields === "*" ? rows
        : rows.map(row => Object.fromEntries(Object.keys(selected).map(key => [key, row[key]])));
      return { data, error: null };
    } catch (error) {
      const e = error as { code?: string; cause?: { code?: string } };
      return { data: null, error: { code: e.cause?.code ?? e.code, message: "Store database query failed." } };
    }
  }
  async maybeSingle(): Promise<Result<Row>> {
    const result = await this.execute();
    if (result.error) return { data: null, error: result.error };
    if ((result.data?.length ?? 0) > 1) return { data: null, error: { message: "Expected at most one store record." } };
    return { data: result.data?.[0] ?? null, error: null };
  }
  async single(): Promise<Result<Row>> {
    const result = await this.maybeSingle();
    return result.data || result.error ? result : { data: null, error: { message: "Store record not found." } };
  }
  then<TResult1 = Result<Row[]>, TResult2 = never>(
    onfulfilled?: ((value: Result<Row[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> { return this.execute().then(onfulfilled, onrejected); }
}

export function getStoreDatabase() {
  return { from: (name: keyof typeof tables) => new StoreQuery(name) };
}

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
const isServerlessRuntime =
  process.env.NETLIFY === "true" || process.env.VERCEL === "1";

if (!databaseUrl && !isServerlessRuntime) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Supabase-backed serverless functions do not need the legacy Replit DB pool.
// Legacy-only routes still require DATABASE_URL when they are used.
export const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : new Pool();
export const db = drizzle(pool, { schema });

export * from "./schema";

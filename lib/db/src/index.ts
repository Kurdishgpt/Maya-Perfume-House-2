import { getDatabase, getConnectionString } from "@netlify/database";
import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema";

// The platform supplies the connection for each deployment context.
let client: ReturnType<typeof createClient> | undefined;
let clientConnection: string | undefined;
function createClient() {
  return drizzle({ client: getDatabase(), schema });
}
export function getDb() {
  const connection = getConnectionString();
  if (!client || connection !== clientConnection) {
    client = createClient();
    clientConnection = connection;
  }
  return client;
}
// Keep initialization lazy: the admin status endpoint needs no database connection.
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, property) {
    const client = getDb();
    const value = Reflect.get(client, property);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
export * from "./schema";

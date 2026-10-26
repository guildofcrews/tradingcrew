import "server-only";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// Node 22+ provides a global WebSocket, which the Neon pool uses for transactions.
if (typeof globalThis.WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = globalThis.WebSocket;
}

const globalForPool = globalThis as unknown as { __tcTradePool?: Pool };

export function getTradeDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  if (!globalForPool.__tcTradePool) {
    globalForPool.__tcTradePool = new Pool({ connectionString, max: 1 });
  }

  return drizzle(globalForPool.__tcTradePool, { schema });
}

export type TradeDatabase = NonNullable<ReturnType<typeof getTradeDb>>;
export type TradeTx = Parameters<Parameters<TradeDatabase["transaction"]>[0]>[0];

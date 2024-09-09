import { getConfig } from "@/config";
import * as schema from "@db/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const { host, port, user, password, name } = getConfig().database;
export const pool = new Pool({
  host,
  port,
  user,
  password,
  database: name,
  ssl: false,
});

export const db = drizzle(pool, { schema });

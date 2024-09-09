import { getConfig } from "@/config";
import { defineConfig } from "drizzle-kit";

const { host, port, user, password, name } = getConfig().database;
export default defineConfig({
  schema: "./src/db/schema/**.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host,
    port,
    user,
    password,
    database: name,
    ssl: false,
  },
});

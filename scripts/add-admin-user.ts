import { db, pool } from "@/db";
import { users } from "@/db/schema";
import { SALT } from "@/routers/auth";
import bcrypt from "bcryptjs";

const ADMIN_EMAIL = "admin@localhost";
const ADMIN_PASSWORD = "admin";

async function main() {
  const password = await bcrypt.hash(ADMIN_PASSWORD, SALT);
  await db.insert(users).values({ email: ADMIN_EMAIL, password, role: "admin" }).onConflictDoNothing();

  console.log(`email: ${ADMIN_EMAIL}`);
  console.log(`password: ${ADMIN_PASSWORD}`);

  await pool.end();
}

main();

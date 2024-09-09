import { pgEnum, pgTable, serial, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["regular", "admin"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }),
  googleId: varchar("google_id", { length: 255 }),
  role: roleEnum("role").notNull().default("regular"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

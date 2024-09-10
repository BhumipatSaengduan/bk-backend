import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, primaryKey, serial, varchar } from "drizzle-orm/pg-core";
import { books } from "./book";
import { carts } from "./cart";

export const roleEnum = pgEnum("role", ["regular", "admin"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }),
  googleId: varchar("google_id", { length: 255 }),
  role: roleEnum("role").notNull().default("regular"),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  cart: one(carts),
  favorites: many(usersToBooks),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const usersToBooks = pgTable(
  "users_to_books",
  {
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.bookId, t.userId] }) })
);

export const usersToBooksRelations = relations(usersToBooks, ({ one }) => ({
  book: one(books, { fields: [usersToBooks.bookId], references: [books.id] }),
  user: one(users, { fields: [usersToBooks.userId], references: [users.id] }),
}));

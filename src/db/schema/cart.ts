import { relations } from "drizzle-orm";
import { integer, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { books } from "./book";
import { users } from "./user";

export const carts = pgTable("carts", {
  id: integer("id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const cartsRelations = relations(carts, ({ one, many }) => ({
  owner: one(users, { fields: [carts.id], references: [users.id] }),
  items: many(books),
}));

export type Cart = typeof carts.$inferSelect;
export type NewCart = typeof carts.$inferInsert;

export const booskToCarts = pgTable(
  "books_to_carts",
  {
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    cartId: integer("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull().default(1),
  },
  (t) => ({ pk: primaryKey({ columns: [t.bookId, t.cartId] }) })
);

export const booksToCartsRelations = relations(booskToCarts, ({ one }) => ({
  book: one(books, { fields: [booskToCarts.bookId], references: [books.id] }),
  cart: one(carts, { fields: [booskToCarts.cartId], references: [carts.id] }),
}));

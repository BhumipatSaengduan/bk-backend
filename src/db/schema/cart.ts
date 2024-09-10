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
  items: many(cartsToBooks),
}));

export type Cart = typeof carts.$inferSelect;
export type NewCart = typeof carts.$inferInsert;

export const cartsToBooks = pgTable(
  "carts_to_books",
  {
    cartId: integer("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull().default(1),
  },
  (t) => ({ pk: primaryKey({ columns: [t.cartId, t.bookId] }) })
);

export const cartsToBooksRelations = relations(cartsToBooks, ({ one }) => ({
  cart: one(carts, { fields: [cartsToBooks.cartId], references: [carts.id] }),
  book: one(books, { fields: [cartsToBooks.bookId], references: [books.id] }),
}));

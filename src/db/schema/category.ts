import { relations } from "drizzle-orm";
import { integer, pgTable, primaryKey, serial, varchar } from "drizzle-orm/pg-core";
import { books } from "./book";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  books: many(categoriesToBooks),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export const categoriesToBooks = pgTable(
  "categories_to_books",
  {
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.categoryId, t.bookId] }) })
);

export const categoriesToBooksRelations = relations(categoriesToBooks, ({ one }) => ({
  category: one(categories, { fields: [categoriesToBooks.categoryId], references: [categories.id] }),
  book: one(books, { fields: [categoriesToBooks.bookId], references: [books.id] }),
}));

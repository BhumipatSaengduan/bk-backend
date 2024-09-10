import { relations } from "drizzle-orm";
import { integer, numeric, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { carts } from "./cart";
import { categories } from "./category";

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  coverImage: varchar("cover_image", { length: 1023 }).notNull(),
  description: text("description").notNull().default(""),
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  stocksAvailable: integer("stocks_available").notNull().default(0),
  sold: integer("sold").notNull().default(0),
  price: numeric("price").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const booksRelation = relations(books, ({ one, many }) => ({
  category: one(categories, {
    fields: [books.categoryId],
    references: [categories.id],
  }),
  carts: many(carts),
}));

export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;

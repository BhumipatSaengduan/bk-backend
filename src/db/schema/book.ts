import { relations } from "drizzle-orm";
import { integer, numeric, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { categoriesToBooks } from "./category";
import { usersToBooks } from "./user";

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  coverImage: varchar("cover_image", { length: 1023 }).notNull(),
  description: text("description").notNull().default(""),
  stocksAvailable: integer("stocks_available").notNull().default(0),
  sold: integer("sold").notNull().default(0),
  price: numeric("price").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const booksRelation = relations(books, ({ one, many }) => ({
  categories: many(categoriesToBooks),
  carts: many(categoriesToBooks),
  favoritesBy: many(usersToBooks),
}));

export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;

export const bookAllFields = {
  id: books.id,
  title: books.title,
  coverImage: books.coverImage,
  description: books.description,
  stocksAvailable: books.stocksAvailable,
  sold: books.sold,
  price: books.price,
  createdAt: books.createdAt,
};

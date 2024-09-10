import { db } from "@/db";
import { User, bookAllFields, books, categories, categoriesToBooks, usersToBooks } from "@/db/schema";
import "@passport/index";

import { getConfig } from "@/config";
import { and, desc, eq, ilike } from "drizzle-orm";
import { Request, Response, Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { isAdmin, isAuthenticated } from "./auth";

const uploadPath = path.join(__dirname, "..", "..", getConfig().uploadDir);

export default class Book {
  router = Router();

  /* multer: file upload */
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  });
  upload = multer({
    storage: this.storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // limit to 5MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
        cb(null, true);
      } else {
        cb(new Error("Only .png, .jpg, and .jpeg format allowed!"));
      }
    },
  });
  /* multer: file upload */

  constructor() {
    // create `upload` directory for cover images
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);

    this.register();
  }

  register() {
    this.router.get("/", this.get);
    this.router.post("/", isAuthenticated, isAdmin, this.add);

    this.router.get("/favorites", isAuthenticated, this.favorites);
    this.router.get("/:bookId", this.getById);
    this.router.put("/:bookId", isAuthenticated, isAdmin, this.update);
    this.router.delete("/:bookId", isAuthenticated, isAdmin, this.delete);

    this.router.get("/:bookId/favorite", isAuthenticated, this.favorite);
    this.router.get("/:bookId/unfavorite", isAuthenticated, this.unfavorite);

    this.router.post(
      "/upload-cover",
      isAuthenticated,
      isAdmin,
      this.upload.single("cover"),
      this.uploadCoverImage
    );
  }

  async get(req: Request, res: Response) {
    const method = `${req.query.method}`;

    // TODO: make it shows multiple categories
    let result;
    if (method === "newest") {
      result = await db.select(bookAllFields).from(books).orderBy(desc(books.createdAt), desc(books.sold)); // order from newest
      result = await addCategoriesToEachBooks(result);
    } else if (method === "best-selling") {
      result = await db.select(bookAllFields).from(books).orderBy(desc(books.sold), desc(books.createdAt)); // order from best selling
      result = await addCategoriesToEachBooks(result);
    } else if (method === "search") {
      // if the method is `search`, it needs `q`
      const q = req.query.q ?? "";
      if (!q) return res.status(400).json({ message: "invalid query (search)" });

      result = await db
        .select(bookAllFields)
        .from(books)
        .where(ilike(books.title, `%${q}%`));
      result = await addCategoriesToEachBooks(result);
    } else {
      result = await db.select(bookAllFields).from(books);
      result = await addCategoriesToEachBooks(result);
    }

    res.json(result);
  }

  async getById(req: Request, res: Response) {
    const bookId = parseInt(req.params.bookId);

    let book = await db.select(bookAllFields).from(books).where(eq(books.id, bookId));
    if (!book) return res.status(404).json({ message: "not found" });

    book = await addCategoriesToBook(book[0]);
    res.json(book);
  }

  async add(req: Request, res: Response) {
    let data, categoryIds;
    try {
      const { categoryIds: categories, ...validated } = getDataFromBody(req.body);
      data = validated;
      categoryIds = categories;
    } catch (err) {
      return res.status(400).json({ message: "invalid body" });
    }

    const returning = await db.insert(books).values(data).onConflictDoNothing().returning();
    if (!returning[0]) return res.status(201).end();

    // add the book to categories
    for (const categoryId of categoryIds) {
      await db.insert(categoriesToBooks).values({ categoryId, bookId: returning[0].id });
    }

    res.status(201).end();
  }

  async update(req: Request, res: Response) {
    const bookId = parseInt(req.params.bookId);

    let data, categoryIds;
    try {
      const { categoryIds: categories, ...validated } = getDataFromBody(req.body);
      data = validated;
      categoryIds = categories;
    } catch (err) {
      return res.status(400).json({ message: "invalid body" });
    }

    // update data
    const returning = await db.update(books).set(data).where(eq(books.id, bookId)).returning();
    if (!returning[0]) res.status(404).json({ message: "not found" });

    // get categories from the exists book
    const _existingCategories = await db.query.categoriesToBooks.findMany({
      where: eq(categoriesToBooks.bookId, returning[0].id),
      columns: { categoryId: true },
    });
    const existingCategories = _existingCategories.map((c) => c.categoryId);

    // remove categories
    const removedCategories = existingCategories.filter((c) => !categoryIds.includes(c)); // to remove categories
    for (const categoryId of removedCategories) {
      await db
        .delete(categoriesToBooks)
        .where(and(eq(categoriesToBooks.categoryId, categoryId), eq(categoriesToBooks.bookId, bookId)));
    }

    // add categories
    const addedCategories = categoryIds.filter((c) => !existingCategories.includes(c)); // to add categories
    for (const categoryId of addedCategories) {
      await db.insert(categoriesToBooks).values({ categoryId, bookId }).onConflictDoNothing();
    }

    res.status(200).end();
  }

  async delete(req: Request, res: Response) {
    const bookId = parseInt(req.params.bookId);
    const returning = await db.delete(books).where(eq(books.id, bookId)).returning();
    if (returning[0]) res.status(204).end();
    else res.status(404).json({ message: "not found" });
  }

  async favorites(req: Request, res: Response) {
    const user = req.user as User;

    let result = await db
      .select(bookAllFields)
      .from(books)
      .innerJoin(usersToBooks, eq(usersToBooks.userId, user.id)); // get books that in the user's favorites
    result = await addCategoriesToEachBooks(result);

    res.json(result);
  }

  async favorite(req: Request, res: Response) {
    const bookId = parseInt(req.params.bookId);
    const user = req.user as User;

    const book = await db.query.books.findFirst({ where: eq(books.id, bookId) });
    if (!book) res.status(404).json({ message: "not found" });

    await db.insert(usersToBooks).values({ bookId: bookId, userId: user.id });
    res.json({ message: "book favorited" });
  }

  async unfavorite(req: Request, res: Response) {
    const bookId = parseInt(req.params.bookId);
    const user = req.user as User;

    const book = await db.query.books.findFirst({ where: eq(books.id, bookId) });
    if (!book) res.status(404).json({ message: "not found" });

    await db
      .delete(usersToBooks)
      .where(and(eq(usersToBooks.bookId, bookId), eq(usersToBooks.userId, user.id)));
    res.json({ message: "book unfavorited" });
  }

  uploadCoverImage(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ message: "no file uploaded" });
    }
    res.json({ file: `/images/${req.file.filename}` });
  }
}

function getDataFromBody(body: any) {
  let { title, coverImage, description, categoryIds, stocksAvailable, sold, price } = body;

  categoryIds = categoryIds ?? [];

  if (!Array.isArray(categoryIds ?? [])) throw new Error();
  if (categoryIds.length > 0 && categoryIds.every((c: any) => typeof c !== "number")) throw new Error();
  return {
    title,
    coverImage,
    description: description ?? "",
    stocksAvailable: stocksAvailable ?? "" ? parseInt(stocksAvailable) : 0,
    sold: sold ?? "" ? parseInt(sold) : 0,
    price: price,
    categoryIds: categoryIds as number[],
  };
}

export async function addCategoriesToBook(book: any) {
  const data = await db
    .select({ id: categoriesToBooks.categoryId })
    .from(categoriesToBooks)
    .where(eq(categoriesToBooks.bookId, book.id));

  const bookCategories = [];
  for (const { id } of data) {
    const category = await db.query.categories.findFirst({ where: eq(categories.id, id) });
    if (category) bookCategories.push(category);
  }

  return { ...book, categories: bookCategories };
}

export async function addCategoriesToEachBooks(array: any[]) {
  const newBooks = [];

  // add categories to each record
  for (const record of array) newBooks.push(await addCategoriesToBook(record));

  return newBooks;
}

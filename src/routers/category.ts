import { db } from "@/db";
import { bookAllFields, books, categories, categoriesToBooks } from "@/db/schema";
import "@passport/index";

import { eq, ilike, inArray } from "drizzle-orm";
import { Request, Response, Router } from "express";
import { isAdmin, isAuthenticated } from "./auth";
import { addCategoriesToEachBooks } from "./book";

export default class Category {
  router = Router();

  constructor() {
    this.register();
  }

  register() {
    this.router.get("/", this.get);
    this.router.post("/", isAuthenticated, isAdmin, this.add);
    this.router.put("/:categoryId", isAuthenticated, isAdmin, this.update);
    this.router.delete("/:categoryId", isAuthenticated, isAdmin, this.delete);
  }

  async get(req: Request, res: Response) {
    const method = req.query.method ?? "";

    if (method === "search") {
      // if the method is `search`, it needs `q`
      const q = req.query.q ?? "";
      if (!q) return res.status(400).json({ message: "invalid query (search)" });

      const result = await db.query.categories.findMany({
        where: ilike(categories.name, `%${q}%`),
      });
      res.json(result);
    } else if (method === "books") {
      // if the method is `books`, it needs `q` for categories
      // category id splits by a comma
      const q = (req.query.q ?? "").toString().split(",");
      if (q.length < 1) return res.status(400).json({ message: "invalid query (search)" });

      const categoryIds: number[] = [];
      // if any values in `q` is not a number then 400
      try {
        for (const id of q) categoryIds.push(parseInt(id));
      } catch (error) {
        return res.status(400).json({ message: "invalid query (search)" });
      }

      let result = await db
        .selectDistinctOn([books.id], bookAllFields)
        .from(books)
        .innerJoin(categoriesToBooks, eq(categoriesToBooks.bookId, books.id)) // get category ids from the book
        .where(inArray(categoriesToBooks.categoryId, categoryIds)); // where the categories must be in the `categoryIds`
      result = await addCategoriesToEachBooks(result);

      res.json(result);
    } else {
      res.json(await db.query.categories.findMany());
    }
  }

  async add(req: Request, res: Response) {
    let data;
    try {
      data = getDataFromBody(req.body);
    } catch (err) {
      return res.status(400).json({ message: "invalid body" });
    }

    await db.insert(categories).values(data).onConflictDoNothing();
    res.status(201).end();
  }

  async update(req: Request, res: Response) {
    const categoryId = parseInt(req.params.categoryId);

    let data;
    try {
      data = getDataFromBody(req.body);
    } catch (err) {
      return res.status(400).json({ message: "invalid body" });
    }

    const returning = await db.update(categories).set(data).where(eq(categories.id, categoryId)).returning();
    if (returning[0]) res.end();
    else res.status(404).json({ message: "not found" });
  }

  async delete(req: Request, res: Response) {
    const categoryId = parseInt(req.params.categoryId);
    const returning = await db.delete(categories).where(eq(categories.id, categoryId)).returning();
    if (returning[0]) res.status(204).end();
    else res.status(404).json({ message: "not found" });
  }
}

function getDataFromBody(body: any) {
  const { name } = body;
  return { name };
}

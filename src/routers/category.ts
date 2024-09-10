import { db } from "@/db";
import { categories } from "@/db/schema";
import "@passport/index";

import { eq, ilike } from "drizzle-orm";
import { Request, Response, Router } from "express";
import { isAdmin, isAuthenticated } from "./auth";

export default class Category {
  router = Router();

  constructor() {
    this.register();
  }

  register() {
    this.router.get("/", this.get);
    this.router.get("/books", this.getWithBooks);
    this.router.post("/", isAuthenticated, isAdmin, this.add);
    this.router.put("/:categoryId", isAuthenticated, isAdmin, this.update);
    this.router.delete("/:categoryId", isAuthenticated, isAdmin, this.delete);
  }

  async get(req: Request, res: Response) {
    const method = `${req.query.method}`;

    let result;
    if (method === "search") {
      // if the method is `search`, it needs `q`
      const q = `${req.query.q || ""}`;
      if (q === "") return res.status(400).json({ message: "invalid query (search)" });

      result = await db.query.categories.findMany({
        where: ilike(categories.name, `%${q}%`),
      });
    } else {
      result = await db.query.categories.findMany({});
    }

    res.json(result);
  }

  async getWithBooks(req: Request, res: Response) {
    const method = `${req.query.method}`;

    let result;
    if (method === "search") {
      // if the method is `search`, it needs `q`
      const q = `${req.query.q || ""}`;
      if (q === "") return res.status(400).json({ message: "invalid query (search)" });

      result = await db.query.categories.findMany({
        with: { books: true },
        where: ilike(categories.name, `%${q}%`),
      });
    } else {
      result = await db.query.categories.findMany({ with: { books: true } });
    }

    // apparently, .[*].books.[*].price is number instead of string
    for (const category of result) {
      for (const book of category.books) {
        book.price = book.price.toString();
      }
    }

    res.json(result);
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

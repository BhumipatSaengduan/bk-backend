import { db } from "@/db";
import { books } from "@/db/schema";
import "@passport/index";

import { getConfig } from "@/config";
import { desc, eq } from "drizzle-orm";
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
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
      );
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
    this.router.put("/:bookId", isAuthenticated, isAdmin, this.update);
    this.router.delete("/:bookId", isAuthenticated, isAdmin, this.delete);

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

    let result;
    if (method === "newest") {
      result = await db.query.books.findMany({
        with: { category: true },
        orderBy: [desc(books.createdAt), desc(books.sold)],
      });
    } else if (method === "best-selling") {
      result = await db.query.books.findMany({
        with: { category: true },
        orderBy: [desc(books.sold), desc(books.createdAt)],
      });
    } else {
      result = await db.query.books.findMany({ with: { category: true } });
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

    await db.insert(books).values(data).onConflictDoNothing();
    res.status(201).end();
  }

  async update(req: Request, res: Response) {
    const bookId = parseInt(req.params.bookId);

    let data;
    try {
      data = getDataFromBody(req.body);
    } catch (err) {
      return res.status(400).json({ message: "invalid body" });
    }

    const returning = await db
      .update(books)
      .set(data)
      .where(eq(books.id, bookId))
      .returning();
    if (returning[0]) res.end();
    else res.status(404).json({ message: "not found" });
  }

  async delete(req: Request, res: Response) {
    const bookId = parseInt(req.params.bookId);
    const returning = await db
      .delete(books)
      .where(eq(books.id, bookId))
      .returning();
    if (returning[0]) res.status(204).end();
    else res.status(404).json({ message: "not found" });
  }

  uploadCoverImage(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ message: "no file uploaded" });
    }
    res.json({ file: `/images/${req.file.filename}` });
  }
}

function getDataFromBody(body: any) {
  const {
    title,
    coverImage,
    description,
    categoryId,
    stocksAvailable,
    sold,
    price,
  } = body;
  return {
    title,
    coverImage,
    description: description || "",
    categoryId: `${categoryId}` === "null" ? null : parseInt(categoryId),
    stocksAvailable:
      `${stocksAvailable}` === "" ? 0 : parseInt(stocksAvailable),
    sold: `${sold}` === "" ? 0 : parseInt(sold),
    price: price,
  };
}

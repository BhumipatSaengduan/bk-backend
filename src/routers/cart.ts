import "@passport/index";

import { db } from "@/db";
import { User, bookAllFields, books, carts, cartsToBooks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextFunction, Request, Response, Router } from "express";
import { isAuthenticated } from "./auth";
import { addCategoriesToEachBooks } from "./book";

export default class Cart {
  router = Router();

  constructor() {
    this.router.use(isAuthenticated);
    this.router.use(this.createUserCart);

    this.register();
  }

  register() {
    this.router.get("/", this.getItems);
    this.router.post("/", this.setItem);
    this.router.get("/checkout", this.checkout);
  }

  async getItems(req: Request, res: Response) {
    const userId = (req.user as User).id;
    let items = await db
      .select(bookAllFields)
      .from(books)
      .innerJoin(cartsToBooks, eq(cartsToBooks.cartId, userId)); // the book needs to be in the cart
    items = await addCategoriesToEachBooks(items);

    let totalPrice = 0;
    for (const item of items) {
      totalPrice += parseFloat(item.price);
    }

    res.json({ totalPrice: totalPrice.toString(), items });
  }

  async setItem(req: Request, res: Response) {
    const userId = (req.user as User).id;

    let data;

    try {
      data = getDataFromBody(req.body);
    } catch (err) {
      return res.status(400).json({ message: "invalid body" });
    }

    const book = await db.query.books.findFirst({ where: eq(books.id, data.bookId) });
    if (!book) return res.status(500).json({ message: "book not found " });

    if (book.stocksAvailable - data.amount < 0) {
      return res.status(400).json({ message: "not sufficient books" });
    }

    const itemWhere = and(eq(cartsToBooks.bookId, data.bookId), eq(cartsToBooks.cartId, userId));

    if (data.amount < 1) {
      // if amount < 1 then delete the item from the cart
      await db.delete(cartsToBooks).where(itemWhere);
      return res.status(204).end();
    }

    const existingItem = await db.query.cartsToBooks.findFirst({ where: itemWhere });
    if (existingItem) {
      // if already exists, update the amount
      await db.update(cartsToBooks).set({ amount: data.amount }).where(itemWhere);
    } else {
      // otherwise, add new with the amount
      await db.insert(cartsToBooks).values({ bookId: data.bookId, cartId: userId, amount: data.amount });
    }

    res.json({ amount: data.amount });
  }

  async checkout(req: Request, res: Response) {
    const userId = (req.user as User).id;

    const items = await db
      .select({
        id: books.id,
        price: books.price,
        stocksAvailable: books.stocksAvailable,
        sold: books.sold,
        amount: cartsToBooks.amount,
      })
      .from(cartsToBooks)
      .where(eq(cartsToBooks.cartId, userId))
      .innerJoin(books, eq(books.id, cartsToBooks.bookId));

    // check available stocks for each book
    const notSufficientBooks = [];
    for (const item of items) {
      if (item.stocksAvailable - item.amount < 0) notSufficientBooks.push(item.id);
    }
    if (notSufficientBooks.length > 0) {
      return res.status(400).json({ message: "not sufficient books", books: notSufficientBooks });
    }

    for (const item of items) {
      // decrease book's stocks and increase book's sold
      await db
        .update(books)
        .set({ stocksAvailable: item.stocksAvailable - item.amount, sold: item.sold + item.amount });
    }

    await db.delete(carts).where(eq(carts.id, userId));

    res.json({ message: "checkout" });
  }

  private async createUserCart(req: Request, res: Response, next: NextFunction) {
    const user = req.user as User;
    await db.insert(carts).values({ id: user.id }).onConflictDoNothing();
    next();
  }
}

function getDataFromBody(body: any) {
  const { bookId, amount } = body;
  return {
    bookId: parseInt(bookId),
    amount: amount ?? "" ? parseInt(amount) : 1,
  };
}

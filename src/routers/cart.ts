import "@passport/index";

import { db } from "@/db";
import { User, carts } from "@/db/schema";
import { NextFunction, Request, Response, Router } from "express";
import { isAuthenticated } from "./auth";

export default class Cart {
  router = Router();

  constructor() {
    this.router.use(isAuthenticated);
    this.router.use(this.createUserCart);

    this.register();
  }

  register() {}

  private async createUserCart(req: Request, res: Response, next: NextFunction) {
    const user = req.user as User;
    await db.insert(carts).values({ id: user.id }).onConflictDoNothing();
    next();
  }
}

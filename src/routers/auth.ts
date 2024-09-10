import "@passport/index";

import { getConfig } from "@/config";
import { db } from "@/db";
import { User, users } from "@/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextFunction, Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import passport from "passport";

export const SALT = 8;

export const isAuthenticated = passport.authenticate("jwt", { session: false });

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if ((req.user as User).role !== "admin") res.status(401).send("Unauthorized");
  else next();
};

export default class Authentication {
  router = Router();

  constructor() {
    this.register();
  }

  register() {
    this.router.post("/register", this.registerLocalAccount);
    this.router.post("/login", this.login);

    this.router.get(
      "/google",
      passport.authenticate("google", {
        scope: ["email"],
        session: false,
      })
    );
    this.router.get("/google/callback", this.googleCallback);

    this.router.get("/set-password", isAuthenticated, this.setPassword);
    this.router.get("/set-role", isAuthenticated, isAdmin, this.setRole);
  }

  async registerLocalAccount(req: Request, res: Response) {
    const { email, password } = req.body as { email: string; password: string };

    try {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (existingUser) return res.status(400).json({ message: "this email is already registered" });

      const hashed = await bcrypt.hash(password, SALT);
      const returning = await db
        .insert(users)
        .values({ email, password: hashed, role: "regular" })
        .returning();

      // if no user returns from insert then send nothing
      if (!returning[0]) return res.status(201).end();

      // otherwise send jwt token
      const user = returning[0];
      res.json({ token: newJwt(user) });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "an error occurred" });
    }
  }

  login(req: Request, res: Response, next: NextFunction) {
    passport.authenticate("local", { session: false }, (err: any, user: User | null, info: any) => {
      const error = validateState(res, [err, user, info]);
      if (error) return error;

      res.json({ token: newJwt(user!) });
    })(req, res, next);
  }

  googleCallback(req: Request, res: Response, next: NextFunction) {
    passport.authenticate("google", { session: false }, (err: any, user: User | null, info: any) => {
      const error = validateState(res, [err, user, info]);
      if (error) return error;

      res.json({ token: newJwt(user!) });
    })(req, res, next);
  }

  async setPassword(req: Request, res: Response) {
    const { id } = req.user as any;

    let password;
    try {
      password = req.body.password;
      if (!password) throw new Error();
    } catch (err) {
      return res.status(400).json({ message: "invalid body" });
    }

    await db
      .update(users)
      .set({ password: await bcrypt.hash(password, SALT) })
      .where(eq(users.id, id));
  }

  async setRole(req: Request, res: Response) {
    const userId = parseInt(req.params.userId);

    let role;
    try {
      role = req.body.role;
    } catch (err) {
      return res.status(400).json({ message: "invalid body" });
    }

    if (role === "regular") {
      await db.update(users).set({ role: "regular" }).where(eq(users.id, userId));
      res.json({ role: "regular" });
    } else if (role === "admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
      res.json({ role: "admin" });
    } else {
      res.status(400).json({ message: "unknown role" });
    }
  }
}

function validateState(res: Response, data: any[]) {
  const [err, user, info] = data;
  if (err) {
    return res
      .status(500)
      .json({ message: err?.message || "an error occurred" })
      .end();
  }
  if (!user) {
    return res
      .status(400)
      .json({ message: info?.message || info || "something went wrong" })
      .end();
  }
}

function newJwt(user: User) {
  return jwt.sign({ id: user!.id, role: user!.role }, getConfig().jwtSecret, {
    expiresIn: "1y",
  });
}

import { db } from "@/db";
import { users } from "@/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { Strategy } from "passport-local";

export default new Strategy({ session: false, usernameField: "email" }, async (email, password, done) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!user) {
      return done(null, false, { message: "incorrect email/password" });
    }

    // if the password is not set and google account is linked
    if (!user.password && user.googleId) {
      return done(null, false, {
        message: "the account is linked to google with no password set. login with google instead",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password!);
    if (!isValidPassword) {
      return done(null, false, { message: "incorrect email/password" });
    }

    return done(null, user);
  } catch (err: any) {
    return done(err);
  }
});

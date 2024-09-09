import { getConfig } from "@/config";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ExtractJwt, Strategy } from "passport-jwt";

export default new Strategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: getConfig().jwtSecret,
  },
  async (payload, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, payload.id),
      });
      if (!user) {
        return done(null, false, "user not found");
      }

      return done(null, user);
    } catch (err: any) {
      return done(err);
    }
  }
);

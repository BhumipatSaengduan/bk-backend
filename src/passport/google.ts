import { getConfig } from "@/config";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Strategy } from "passport-google-oauth20";

const { clientId, clientSecret } = getConfig().googleOAuth;

export default new Strategy(
  { clientID: clientId, clientSecret, callbackURL: "/auth/google/callback" },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const { id: googleId } = profile;

      // if an account already linked with google
      const userFromGoogle = await db.query.users.findFirst({
        where: eq(users.googleId, googleId),
      });
      if (userFromGoogle) return done(null, userFromGoogle);

      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(null, false, { message: "no email provided from google" });
      }

      // if an account not linked with google but email is registered
      // then link the google to it
      const updatedUser = await db.update(users).set({ googleId }).where(eq(users.email, email)).returning();

      // if no user returned means no user with this email
      if (!updatedUser[0]) {
        const addedUser = await db.insert(users).values({ email, googleId, role: "regular" }).returning();

        // if no user returns (which shouldn't happen)
        if (!addedUser) done(new Error("failed to add user"), false);

        // return the new added user
        return done(null, addedUser);
      }

      return done(null, updatedUser[0]);
    } catch (err: any) {
      return done(err);
    }
  }
);

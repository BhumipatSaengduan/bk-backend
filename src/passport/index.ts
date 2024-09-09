import GoogleStrategy from "@passport/google";
import JwtStrategy from "@passport/jwt";
import LocalStrategy from "@passport/local";
import passport from "passport";

passport.use(LocalStrategy);
passport.use(GoogleStrategy);
passport.use(JwtStrategy);

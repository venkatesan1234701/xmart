
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        return done(null, profile);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));

passport.deserializeUser((obj, done) => done(null, obj));

module.exports = passport;

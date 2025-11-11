module.exports = function isGoogleUser(req, res, next) {
  if (req.isAuthenticated() && req.user.googleId) {
    return next()
  }
  res.redirect("/signin")
};

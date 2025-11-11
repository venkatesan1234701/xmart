function Authenticated(req, res, next) {
  if (req.session && req.session.user && req.session.user.id) {
    req.user = req.session.user; // attach user to req
    return next();
  }
  res.redirect("/signin");
}

module.exports = { Authenticated };
function Authenticated(req, res, next) {
  if (req.session && req.session.user && req.session.user.id) {
    req.user = req.session.user; 
    return next();
  }
  res.redirect("/signin");
}

module.exports = { Authenticated };
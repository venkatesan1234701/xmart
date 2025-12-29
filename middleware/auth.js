const preventAuthPagesForLoggedInUsers = (req, res, next) => {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  if (req.session.user) {
    return res.redirect("/");
  }
  next();
};

module.exports = preventAuthPagesForLoggedInUsers;

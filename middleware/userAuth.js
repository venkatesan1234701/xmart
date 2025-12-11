
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user && req.session.user.id) {
    req.user = req.session.user; 
    return next();
  }
  return res.status(401).json({ success: false, message: "Login required" });
}

module.exports = { isAuthenticated };

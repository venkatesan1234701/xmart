
function adminAuth(req, res, next) {
  if (req.session.isAdminLogged) {
    return next();
  }
  return res.redirect('/admin/login');
}

module.exports = adminAuth;
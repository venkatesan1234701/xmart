
module.exports = (req, res, next) => {
  try {
    if (req.user && req.user.isBlocked) { 
      req.logout(err => {
        if (err) return next(err);
        req.session.destroy(() => {
          return res.redirect('/signin?blocked=true');
        })
      })
    } else {
      next()
    }
  } catch (err) {
    console.error("Blocked middleware error:", err);
    next(err);
  }
};

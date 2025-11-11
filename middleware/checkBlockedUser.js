// Middleware to check if user is blocked (Passport + session)
module.exports = (req, res, next) => {
  try {
    if (req.user && req.user.isBlocked) { // check schema field
      // destroy session & logout
      req.logout(err => {
        if (err) return next(err);
        req.session.destroy(() => {
          // redirect user to signin page with blocked message
          return res.redirect('/signin?blocked=true');
        });
      });
    } else {
      next(); // user not blocked → continue
    }
  } catch (err) {
    console.error("Blocked middleware error:", err);
    next(err);
  }
};

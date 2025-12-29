const User = require("../models/userSchema");

const checkBlockedUser = async (req, res, next) => {
  try {
    if (!req.session.user) return next();

    const user = await User.findById(req.session.user.id).select("isBlocked");

    if (!user || user.isBlocked) {
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        return res.redirect("/blocked");
      });
      return;
    }

    next();
  } catch (err) {
    console.error("checkBlockedUser error:", err);
    next();
  }
};

module.exports = checkBlockedUser;

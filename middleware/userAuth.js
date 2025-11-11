// const User = require('../../model/userSchema')

// module.exports = async function (req, res, next) {
//   try {
//     if (req.session.isLogged) {
//       const user = await User.findById(req.session.userId)

//       if (!user) {
//         return res.redirect('/auth/signin')
//       }

//       if (user.isBlocked) {
//         return res.redirect('/auth/blocked')
//       }

//       next()
//     } else {
//       console.log('User not logged in')
//       return res.redirect('/auth/signin')
//     }
//   } catch (err) {
//     console.log('middleware error: ', err)
//     return res.redirect('/auth/signin')  
//   }
// }
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user && req.session.user.id) {
    req.user = req.session.user; // attach user to req
    return next();
  }
  return res.status(401).json({ success: false, message: "Login required" });
}

module.exports = { isAuthenticated };

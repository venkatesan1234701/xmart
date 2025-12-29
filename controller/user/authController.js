const User = require("../../models/userSchema")
const Otp = require("../../models/otpSchema")
const Referral = require("../../models/referralSchema")
const nodemailer = require("nodemailer")
const mongoose = require("mongoose");
const category = require('../../models/category')
const AppError = require('../../utils/appError');
const Product = require("../../models/productModel")
// const transporter = require("../../config/nodemailer"); 
const passport = require("passport");
const bcrypt = require("bcrypt")
const crypto = require("crypto")
const cron = require("node-cron")
// const Product = require('../../models/Product');
const ProductOffer = require('../../models/productOfferModel')
const CategoryOffer = require("../../models/categoryOffer");
const Wallet = require("../../models/walletSchema");




const gethomepage = async (req, res) => {
  try {
    const products = await Product.find({ isDeleted: false })
      .populate("category")
      .sort({ createdAt: -1 })
      .lean();

    products.forEach(p => { 
      if(!p.images) p.images = []; 
    });

    const activeProductOffers = await ProductOffer.find({
      currentStatus: 'active',
      isListed: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).lean();

    const activeCategoryOffers = await CategoryOffer.find({
      status: 'list',
      isListed: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).lean();

    const productsWithOffer = products.map(p => {
      const productOffer = activeProductOffers.find(o => o.product.toString() === p._id.toString());
      let categoryOffer = null;

      if (p.category) {
        categoryOffer = activeCategoryOffers.find(c => c.category.toString() === p.category._id.toString());
      }

      let finalOffer = null;
      if (productOffer && categoryOffer) {
        finalOffer = productOffer.offerPercentage >= categoryOffer.offerPercentage
          ? productOffer
          : categoryOffer;
      } else if (productOffer) {
        finalOffer = productOffer;
      } else if (categoryOffer) {
        finalOffer = categoryOffer;
      }

      return { ...p, offer: finalOffer };
    });

    res.render("user/index", { 
      products: productsWithOffer, 
      user: req.session.user || null
    });

  } catch(err) {
    console.error("getHomepage error:", err);
    res.status(500).send("Server Error");
  }
};




const getProductDetails = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean()
    if(!product) return res.status(404).send("Product not found")

    if(!product.images) product.images = [];

    res.render('user/product-details', { product, user: req.session.userName ? { name: req.session.userName } : null })
  } catch(err) {
    console.error(err)
    res.status(500).send("Server Error")
  }
}


const getSignupPage = (req, res) => {
   if (req.session.user) {
    return res.redirect("/");
  }
  res.render("user/signup",{user:null})
}


const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});




const postSignup = async (req, res) => {
  try {
    // console.log(" FULL Signup Body:", req.body);

    const {
      firstName,
      secondName,
      email,
      phoneNumber,
      password,
      referralCode,
    } = req.body;

    let referredBy = null;

    // console.log("referral code :", referralCode);

    let user = await User.findOne({ email });
    const hashedPass = await bcrypt.hash(password, 10);

    if (user) {
      if (user.isVerified) {
        return res.render("user/signup", {
          sweetError: "Email already registered. Please login.",
          formData: req.body,
        });
      }
      user.firstName = firstName;
      user.secondName = secondName;
      user.phone = String(phoneNumber);
      user.password = hashedPass;
      user.loginType = "manual"

         if (!user.referralCode) {
        user.referralCode = await generateUniqueReferralCode();
      }
      await user.save();

    } else {
      if (referralCode && referralCode.trim().length > 0) {
        // console.log(" cheking reffral code :", referralCode);

        const referralUser = await User.findOne({ referralCode });
        if (!referralUser) {
          return res.render("user/signup", {
            error: "Invalid referral code!",
            formData: req.body,
          });
        }

        referredBy = referralUser._id;
        // console.log(" valid reffral code :", referredBy);
      }

      const newReferralCode = await generateUniqueReferralCode();

      user = new User({
        firstName,
        secondName,
        email,
        phone: String(phoneNumber),
        password: hashedPass,
        referredBy,
        referralCode: newReferralCode,
        isVerified: false,
        loginType: "manual", 
      });

      await user.save()
    }

    const otpCode = crypto.randomInt(100000, 999999).toString()
    console.log(" Signup OTP:", otpCode);

    await Otp.updateOne(
      { email },
      {
        otp: await bcrypt.hash(otpCode, 10),
        createdAt: new Date(),
        expireAt: Date.now() + 75 * 1000,
      },
      { upsert: true }
    )

    let mailStatus = "OTP sent to your email";
    try {
      await transporter.sendMail({
        from: `"Bro Basket" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP is: ${otpCode}. It expires in 75 seconds.`,
      });
    } catch (mailErr) {
      console.error("Email send failed:", mailErr.message);
      mailStatus = "Failed to send OTP email. Please try Resend OTP.";
    }

    req.session.otpEmail = email;
    req.session.flowType = "signup";

    return res.render("user/otpPage", { email, message: mailStatus });

  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).redirect("/signin");
  }
}

const verifyOtp = async (req, res) => {
  try {
    const email = req.session.otpEmail;
    const flowType = req.session.flowType;

    if (!email) return res.redirect("/signup");

    const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;

    if (![otp1, otp2, otp3, otp4, otp5, otp6].every((d) => d && d.trim() !== "")) {
      return res.render("user/otpPage", {
        email,
        error: "Please fill all 6 OTP digits.",
      });
    }

    const enteredOtp = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;

    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
      return res.render("user/otpPage", {
        email,
        error: "OTP not found. Please resend.",
      });
    }

    if (Date.now() > otpRecord.expireAt) {
      return res.render("user/otpPage", {
        email,
        error: "OTP expired. Please resend.",
      });
    }

    const isMatch = await bcrypt.compare(enteredOtp, otpRecord.otp);
    if (!isMatch) {
      return res.render("user/otpPage", {
        email,
        error: "PLEASE ENTER A CURRECT OTP.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) return res.redirect("/signup");

    if (flowType === "signup") {
      user.isVerified = true;
      await user.save();
if (user.referredBy && !user.referralBonusGiven) {
  let wallet = await Wallet.findOne({ userId: user._id });

  if (!wallet) {
    wallet = await Wallet.create({ userId: user._id, balance: 0 });
  }

  const referralTransactionId =
    "REF" + Math.floor(100000 + Math.random() * 900000);

  await wallet.addTransaction({
    amount: 100,
    type: "Referral",
    status: "completed",
    transactionType: "Credit",
    transactionDetail: "Referral bonus",
    transactionId: referralTransactionId,
  });

  user.referralBonusGiven = true;
  await user.save();
}

if (user.referredBy) {
  let wallet = await Wallet.findOne({ userId: user.referredBy });

  if (!wallet) {
    wallet = await Wallet.create({ userId: user.referredBy, balance: 0 });
  }
const refundTransactionId = "REF" + Math.floor(100000 + Math.random() * 900000);
  wallet.balance += 200;
  wallet.transactions.push({
    transactionId: refundTransactionId,  
    amount: 200,
    type: "Referral",
    transactionType: "Credit",
    transactionDetail: "Referral bonus credited",
    status: "completed",
    date: new Date(),                    
  });

  await wallet.save();
}


      await Otp.deleteOne({ email });

      req.session.user = {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        secondName: user.secondName,
        loginType: user.loginType || "manual",
      };

      return res.render("user/otpPage", {
        email,
        success: "Signup successful! Redirecting...",
        redirectUrl: "/", 
      });
    }

    if (flowType === "forgot") {
      await Otp.deleteOne({ email });

      return res.render("user/otpPage", {
        email,
        success: "OTP verified! Redirecting to reset password...",
        redirectUrl: `/reset-password?email=${email}`,
      });
    }

    return res.redirect("/");

  } catch (err) {
    console.error("OTP Verification Error:", err);
    res.status(500).send("Server Error");
  }
};



async function generateUniqueReferralCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code;
  let exists = true;

  while (exists) {
    code = "";
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    exists = await User.findOne({ referralCode: code });
  }

  return code;
}




const resendOtp = async (req, res) => {
  try {
    const email = req.body.email || req.session.otpEmail;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).render("user/signup", { error: "User not found! Please signup." });
    }

    if (user.isVerified) {
      return res.redirect("/signin");
    }

    const otpCode = crypto.randomInt(100000, 999999).toString();
    console.log("Resend OTP:", otpCode);

    await Otp.updateOne(
      { email },
      {
        otp: await bcrypt.hash(otpCode, 10),
        createdAt: new Date(),
        expireAt: Date.now() + 75 * 1000,
      },
      { upsert: true }
    );

    try {
      await transporter.sendMail({
        from: `"Bro Basket" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP is: ${otpCode}. It expires in 75 seconds.`,
      });
    } catch (mailErr) {
      console.error("Email send failed:", mailErr);
      return res.render("user/otpPage", { email, error: "OTP could not be sent. Try again later." });
    }

    req.session.otpEmail = email;
    return res.render("user/otpPage", { email, success: "OTP has been resent!" });

  } catch (err) {
    console.error("Resend OTP Error:", err)
    res.status(500).send("Server Error")
  }
}




const getResetPassword = (req, res) => {
  const email = req.query.email; 
  res.render("user/reset-password", { email });
}

const postResetPassword = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    if (!password || !confirmPassword) {
      return res.render("user/reset-password", { email, error: "Please fill all fields!" })
    }
    if (password !== confirmPassword) {
      return res.render("user/reset-password", { email, error: "Passwords do not match!" })
    }
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await User.updateOne({ email }, { $set: { password: hashedPassword } })

    if (result.modifiedCount === 0) {
      return res.render("user/reset-password", { email, error: "User not found or password not updated!" })
    }

    return res.redirect("/signin")

  } catch (err) {
    console.error("Reset Password Error:", err)
    res.status(500).send("Server Error")
  }
}


const getSigninPage = (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  res.render("user/signin", { user: null });
};



const postSignin = async (req, res) => {
  try {
    if (req.session.user) {
      return res.json({ ok: true, redirect: "/" });
    }

    const { email, password, returnUrl } = req.body;

    if (!email || !password) {
      return res.json({ ok: false, msg: 'Please fill all fields' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ ok: false, msg: 'Invalid credentials' });

    if (user.isBlocked) {
      return res.json({
        ok: false,
        blocked: true,
        msg: 'Your account is blocked. Contact support.'
      });
    }

    if (user.loginType === "google") {
      return res.json({
        ok: false,
        googleUser: true,
        msg: "You already signed up using Google. Please use Google login."
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ ok: false, msg: 'INCURRCT PASSWORD' });

    if (!user.isVerified) {
      return res.json({
        ok: false,
        verify: false,
        msg: 'Your account is not verified. Please verify your email.'
      });
    }

    req.session.user = {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      secondName: user.secondName,
      loginType: user.loginType
    };

    return res.json({
      ok: true,
      verify: true,
      redirect: returnUrl || req.session.returnUrl || '/'
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, msg: 'Server error' });
  }
}



const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ ok: false, msg: 'Email required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ ok: false, msg: 'User not found' });
    if (user.isVerified) return res.json({ ok: false, msg: 'Already verified' });

    return res.json({ ok: true, msg: 'Verification email sent. Check inbox/spam' });

  } catch (err) {
    console.error(err);
    return res.json({ ok: false, msg: 'Server error' });
  }
}



const getForgotPassword = (req, res) => {
  res.render("user/forgot-password")
}

const postForgotPassword = async (req, res) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({ email })
    if (!user) {
      return res.render("user/forgot-password", { error: "Email not found!" })
    }

    const otpCode = crypto.randomInt(100000, 999999).toString()
    console.log('forgot',otpCode)
    await Otp.updateOne(
      { email },
      {
        otp: await bcrypt.hash(otpCode, 10),
        createdAt: new Date(),
        expireAt: Date.now() + 5 * 60 * 1000,
      },
      { upsert: true }
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Bro Basket" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Password OTP",
      text: `Your OTP is: ${otpCode}. It expires in 5 minutes.`,
    })
    req.session.otpEmail = email;
    req.session.flowType = "forgot";

    res.render("user/otpPage", { email })
  } catch (err) {
    console.error("Forgot Password Error:", err)
    res.status(500).send("Server Error")
  }
}



const postResetforgotPassword = async (req, res) => {
  try {
    const { email, password, confirmPassword, otp } = req.body;

    if (!req.session.otpEmail || req.session.otpEmail !== email) {
      return res.render("user/otpPage", { error: "Session expired or invalid email", email });
    }

    if (!password || !confirmPassword) {
      return res.render("user/otpPage", { email, error: "Please fill both password fields" });
    }

    if (password !== confirmPassword) {
      return res.render("user/otpPage", { email, error: "Passwords do not match" });
    }

    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
      return res.render("user/otpPage", { email, error: "OTP not found. Please try again." });
    }

    const isOtpValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isOtpValid || otpRecord.expireAt < Date.now()) {
      return res.render("user/otpPage", { email, error: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.render("user/otpPage", { email, error: "User not found" });
    }

    const isSameAsOld = await bcrypt.compare(password, user.passwordHash || user.password);
    if (isSameAsOld) {
      return res.render("user/otpPage", { email, error: "New password must not be same as old password" });
    }

    const hash = await bcrypt.hash(password, 10)
    user.passwordHash = hash;
    await user.save()


    req.session.otpEmail = null;
    req.session.flowType = null;
    await Otp.deleteOne({ email })

    return res.render("user/login", { success: "Password reset successful. Please login." })
  } catch (err) {
    console.error("postResetPassword error:", err)
    return res.status(500).send("Server Error")
  }
};


const checkPasswordMatch = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Missing fields', match: false });
    }

    const user = await User.findOne({ email }).lean();
    if (!user) {
   
      return res.status(404).json({ error: 'User not found', match: false });
    }

    const match = await bcrypt.compare(newPassword, user.passwordHash || user.password);

    return res.json({ match: !!match });
  } catch (err) {
    console.error('checkPasswordMatch error:', err);
    return res.status(500).json({ error: 'Server error', match: false });
  }
}


cron.schedule("0 0 * * *", async () => {
  try {
    const expiryDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const result = await User.deleteMany({
      isVerified: false,
      createdAt: { $lt: expiryDate },
    })
    console.log(`${result.deletedCount} unverified accounts deleted.`)
  } catch (error) {
    console.error("Error deleting unverified accounts:", error)
  }
})




const authenticateGoogle = (req, res, next) => {
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
};




// const googleCallBack = (req, res, next) => {
//   passport.authenticate(
//     "google",
//     { failureRedirect: "/signin" },
//     async (err, googleUser) => {
//       if (err) return next(err);
//       if (!googleUser) return res.redirect("/signin");

//       try {
//         const email = googleUser.emails[0].value;

//         let user = await User.findOne({ google_id: googleUser.id });

//         if (!user) {
//           user = await User.findOne({ email });
//         }

//           if (user.isBlocked) {
//     return res.send(`
//       <script>
//         alert("Your account has been blocked by admin.");
//         window.location.replace('/signin');
//       </script>
//     `);
//   }

//         if (user) {
//           if (user.loginType !== "google") {
//             return res.send(`
//               <script>
//                 alert("This email is already registered. Please login using email & password.");
//                 window.location.replace('/signin');
//               </script>
//             `);
//           }

//           req.session.user = {
//             id: user._id.toString(),
//             email: user.email,
//             firstName: user.firstName,
//             secondName: user.secondName,
//             loginType: "google"
//           };

//           return res.send(`<script>window.location.replace('/');</script>`);
//         }

//         const referralCode = await generateUniqueReferralCode();

//         const newUser = new User({
//           google_id: googleUser.id,
//           firstName: googleUser.name.givenName,
//           secondName: googleUser.name.familyName,
//           email,
//           isVerified: true,
//           referralCode,
//           loginType: "google"
//         });

//         await newUser.save();

//         await Wallet.create({ userId: newUser._id, balance: 0, transactions: [] });
//         await Referral.create({ code: referralCode, userId: newUser._id });

//         req.session.user = {
//           id: newUser._id.toString(),
//           email: newUser.email,
//           firstName: newUser.firstName,
//           secondName: newUser.secondName,
//           loginType: "google"
//         };

//         return res.send(`<script>window.location.replace('/');</script>`);

//       } catch (error) {
//         console.error("Google Auth Error:", error);
//         return next(error);
//       }
//     }
//   )(req, res, next);
// };


const googleCallBack = (req, res, next) => {
  passport.authenticate(
    "google",
    { failureRedirect: "/signin" },
    async (err, googleUser) => {
      if (err) return next(err);
      if (!googleUser) return res.redirect("/signin");

      try {
        const email = googleUser.emails?.[0]?.value;
        if (!email) return res.redirect("/signin");

        let user = await User.findOne({ google_id: googleUser.id });

        if (!user) {
          user = await User.findOne({ email });
        }

        // ✅ IMPORTANT FIX: user exists ah nu FIRST check
        if (user) {

          // ✅ NOW SAFE TO CHECK isBlocked
          if (user.isBlocked) {
            return res.send(`
              <script>
                alert("Your account has been blocked by admin.");
                window.location.replace('/signin');
              </script>
            `);
          }

          // ❌ Email user trying Google login
          if (user.loginType !== "google") {
            return res.send(`
              <script>
                alert("This email is already registered. Please login using email & password.");
                window.location.replace('/signin');
              </script>
            `);
          }

          // ✅ LOGIN SUCCESS
          req.session.user = {
            id: user._id.toString(),
            email: user.email,
            firstName: user.firstName,
            secondName: user.secondName,
            loginType: "google"
          };

          return res.send(`<script>window.location.replace('/');</script>`);
        }

        // 🆕 USER NOT FOUND → CREATE NEW GOOGLE USER
        const referralCode = await generateUniqueReferralCode();

        const newUser = new User({
          google_id: googleUser.id,
          firstName: googleUser.name?.givenName || "",
          secondName: googleUser.name?.familyName || "",
          email,
          isVerified: true,
          referralCode,
          loginType: "google",
          isBlocked: false
        });

        await newUser.save();

        await Wallet.create({
          userId: newUser._id,
          balance: 0,
          transactions: []
        });

        await Referral.create({
          code: referralCode,
          userId: newUser._id
        });

        req.session.user = {
          id: newUser._id.toString(),
          email: newUser.email,
          firstName: newUser.firstName,
          secondName: newUser.secondName,
          loginType: "google"
        };

        return res.send(`<script>window.location.replace('/');</script>`);

      } catch (error) {
        console.error("Google Auth Error:", error);
        return next(error);
      }
    }
  )(req, res, next);
};


const logout = (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).send("Something went wrong")
      }
      res.clearCookie("connect.sid")
      res.redirect("/")
    })
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
}


const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
  
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send("Invalid credentials");
    }

    if (user.isBlocked) {
      return res.status(403).send("Your account is blocked. Contact admin.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send("Invalid credentials");
    }

    user.lastLogin = new Date();
    await user.save();

    req.session.userId = user._id;
    res.redirect("/dashboard")
  } catch (err) {
    next(err)
  }
}



const checkBlocked = async (req, res) => {
  try {
    if (!req.session.userId) return res.json({ isBlocked: false });

    const user = await User.findById(req.session.userId);
    if (!user) return res.json({ isBlocked: false });

    res.json({ isBlocked: user.isBlocked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ isBlocked: false });
  }
}


const checkReferral = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.json({ success: false, message: "Referral code cannot be empty" });

    const referrer = await User.findOne({ referralCode: code.toUpperCase() });
    if (!referrer) {
      return res.json({ success: false, message: "Invalid referral code" });
    }

    return res.json({ success: true, message: "Referral code valid" });
  } catch (err) {
    console.error("Referral check error:", err);
    res.json({ success: false, message: "Server error. Try again later." });
  }
}



module.exports = {
  getSignupPage,
  postSignup,
  getSigninPage,
  getForgotPassword,
  postForgotPassword,
  resendOtp,
  verifyOtp,
  postResetPassword,
  getResetPassword,
  googleCallBack,
  authenticateGoogle,
  logout,
  loginUser,
  gethomepage,
  postSignin,
  resendVerification,
  getProductDetails,
  checkBlocked,
  checkPasswordMatch,
  postResetforgotPassword,
  checkReferral
}

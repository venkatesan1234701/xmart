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
  res.render("user/signup")
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




// async function generateUniqueReferralCode(length = 6) {
//   const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
//   let code;
//   let exists = true;

//   while (exists) {
//     code = "";
//     for (let i = 0; i < length; i++) {
//       code += chars.charAt(Math.floor(Math.random() * chars.length));
//     }
//     exists = await User.findOne({ referralCode: code });
//   }

//   return code;
// }

// const postSignup = async (req, res) => {
//   try {
//     const { firstName, secondName, email, phoneNumber, password, referralCode } = req.body;

//     let user = await User.findOne({ email });
//     const hashedPass = await bcrypt.hash(password, 10);

//     if (user) {
//       // Existing user
//       if (user.isVerified) {
//         return res.render("user/signup", { 
//           sweetError: "Email already registered. Please login.", 
//           formData: req.body 
//         });
//       }

//       // Update unverified user
//       user.firstName = firstName;
//       user.secondName = secondName;
//       user.phone = String(phoneNumber);
//       user.password = hashedPass;
//       await user.save();

//     } else {
//       // New user
//       let referredBy = null;

//       if (referralCode) {
//         const referral = await User.findOne({ referralCode: referralCode });
//         if (!referral) {
//           return res.render("user/signup", { error: "Invalid referral code!" });
//         }
//         referredBy = referral._id;
//       }

//       const newReferralCode = await generateUniqueReferralCode();

//       user = new User({
//         firstName,
//         secondName,
//         email,
//         phone: String(phoneNumber),
//         password: hashedPass,
//         referredBy,
//         referralCode: newReferralCode,
//         isVerified: false,
//       });

//       await user.save();
//     }

//     // Generate OTP
//     const otpCode = crypto.randomInt(100000, 999999).toString();
//     console.log("Signup OTP:", otpCode);

//     await Otp.updateOne(
//       { email },
//       {
//         otp: await bcrypt.hash(otpCode, 10),
//         createdAt: new Date(),
//         expireAt: Date.now() + 75 * 1000,
//       },
//       { upsert: true }
//     );

//     let mailStatus = "OTP sent to your email";
//     try {
//       await transporter.sendMail({
//         from: `"Bro Basket" <${process.env.EMAIL_USER}>`,
//         to: email,
//         subject: "Your OTP Code",
//         text: `Your OTP is: ${otpCode}. It expires in 75 seconds.`,
//       });
//     } catch (mailErr) {
//       console.error("Email send failed:", mailErr.message);
//       mailStatus = "Failed to send OTP email. Please try Resend OTP.";
//     }

//     req.session.otpEmail = email;
//     req.session.flowType = "signup";

//     return res.render("user/otpPage", { email, message: mailStatus });

//   } catch (err) {
//     console.error("Signup Error:", err);
//     res.status(500).redirect("/signin");
//   }
// };


// const postSignup = async (req, res) => {
//   try {
//     console.log(" FULL Signup Body:", req.body);

//     const {
//       firstName,
//       secondName,
//       email,
//       phoneNumber,
//       password,
//       referralCode,
//     } = req.body;

//     let referredBy = null;

//     console.log("🔍 Received referralCode:", referralCode);

//     let user = await User.findOne({ email });
//     const hashedPass = await bcrypt.hash(password, 10);

//     if (user) {
//       if (user.isVerified) {
//         return res.render("user/signup", {
//           sweetError: "Email already registered. Please login.",
//           formData: req.body,
//         });
//       }
//       user.firstName = firstName;
//       user.secondName = secondName;
//       user.phone = String(phoneNumber);
//       user.password = hashedPass;
//       await user.save();
//     }
//     else {
//       if (referralCode && referralCode.trim().length > 0) {
//         console.log(" Checking Referral Code:", referralCode);

//         const referralUser = await User.findOne({ referralCode });

//         if (!referralUser) {
//           console.log(" Invalid referral code entered");
//           return res.render("user/signup", {
//             error: "Invalid referral code!",
//             formData: req.body,
//           });
//         }

//         referredBy = referralUser._id;
//         console.log("✔ VALID REFERRAL → referredBy:", referredBy);
//       }

//       const newReferralCode = await generateUniqueReferralCode();

//       user = new User({
//         firstName,
//         secondName,
//         email,
//         phone: String(phoneNumber),
//         password: hashedPass,
//         referredBy,
//         referralCode: newReferralCode,
//         isVerified: false,
//       });

//       await user.save();
//     }

//     console.log("Referral Debug → referredBy:", referredBy);

//     if (referredBy) {
//       console.log(" Referral bonus applicable → Crediting ₹200 to:", referredBy);

//       let wallet = await Wallet.findOne({ userId: referredBy });

//       console.log("Existing Wallet Found:", wallet ? "YES" : "NO");

//       if (!wallet) {
//         wallet = await Wallet.create({ userId: referredBy, balance: 0 });
//         console.log("Created new wallet for referral user");
//       }

//       wallet.balance += 200;
//       console.log("Updated Wallet Balance:", wallet.balance);

//       wallet.transactions.push({
//         amount: 200,
//         type: "Referral",
//         transactionType: "Credit",
//         transactionDetail: "Referral bonus credited",
//         status: "completed",
//       });

//       await wallet.save();
//       console.log("Wallet Saved Successfully → Referral bonus added!");
//     }
//     const otpCode = crypto.randomInt(100000, 999999).toString();
//     console.log(" Signup OTP:", otpCode);

//     await Otp.updateOne(
//       { email },
//       {
//         otp: await bcrypt.hash(otpCode, 10),
//         createdAt: new Date(),
//         expireAt: Date.now() + 75 * 1000,
//       },
//       { upsert: true }
//     );

//     let mailStatus = "OTP sent to your email";
//     try {
//       await transporter.sendMail({
//         from: `"Bro Basket" <${process.env.EMAIL_USER}>`,
//         to: email,
//         subject: "Your OTP Code",
//         text: `Your OTP is: ${otpCode}. It expires in 75 seconds.`,
//       });
//     } catch (mailErr) {
//       console.error("Email send failed:", mailErr.message);
//       mailStatus = "Failed to send OTP email. Please try Resend OTP.";
//     }

//     req.session.otpEmail = email;
//     req.session.flowType = "signup";

//     // RENDER OTP PAGE
//     return res.render("user/otpPage", { email, message: mailStatus });

//   } catch (err) {
//     console.error("Signup Error:", err);
//     res.status(500).redirect("/signin");
//   }
// }

// const verifyOtp = async (req, res) => {
//   try {
//     const email = req.session.otpEmail;
//     const flowType = req.session.flowType;
//     const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;

//     if (!email) {
//       return res.redirect("/signup");
//     }

//     const enteredOtp = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;

//     const otpRecord = await Otp.findOne({ email });
//     if (!otpRecord) {
//       return res.render("user/otpPage", {
//         email,
//         error: "OTP not found. Please resend.",
//       });
//     }

//     if (Date.now() > otpRecord.expireAt) {
//       return res.render("user/otpPage", {
//         email,
//         error: "OTP expired. Please resend.",
//       });
//     }

//     const isMatch = await bcrypt.compare(enteredOtp, otpRecord.otp);
//     if (!isMatch) {
//       return res.render("user/otpPage", {
//         email,
//         error: "Invalid OTP. Try again.",
//       });
//     }

//     if (flowType === "signup") {
//       await User.updateOne({ email }, { isVerified: true });
//       req.session.user = await User.findOne({ email });
//       await Otp.deleteOne({ email });
//       return res.render("user/otpPage", {
//         email,
//         success: "Signup successful! Redirecting...",
//       });
//     }

//     if (flowType === "forgot") {
//       await Otp.deleteOne({ email });
//       return res.render("user/otpPage", {
//         email,
//         success: "OTP verified! Redirecting to reset password...",
//         redirectUrl: `/reset-password?email=${email}`,
//       })
//     }

//     return res.redirect("/");
//   } catch (err) {
//     console.error("OTP Verification Error:", err);
//     res.status(500).send("Server Error");
//   }
// }


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

    // console.log("Received referralCode:", referralCode);

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
      await user.save();
    } else {
      if (referralCode && referralCode.trim().length > 0) {
        // console.log(" Checking Referral Code:", referralCode);

        const referralUser = await User.findOne({ referralCode });
        if (!referralUser) {
          return res.render("user/signup", {
            error: "Invalid referral code!",
            formData: req.body,
          });
        }

        referredBy = referralUser._id;
        // console.log(" VALID REFERRAL → referredBy:", referredBy);
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
    const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;

    if (!email) return res.redirect("/signup");

    const enteredOtp = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
      return res.render("user/otpPage", { email, error: "OTP not found. Please resend." });
    }

    if (Date.now() > otpRecord.expireAt) {
      return res.render("user/otpPage", { email, error: "OTP expired. Please resend." });
    }

    const isMatch = await bcrypt.compare(enteredOtp, otpRecord.otp);
    if (!isMatch) {
      return res.render("user/otpPage", { email, error: "Invalid OTP. Try again." });
    }

    const user = await User.findOne({ email });

    if (flowType === "signup") {
      user.isVerified = true;
      await user.save();

      if (user.referredBy) {
        console.log(" Adding ₹200 Referral Bonus to:", user.referredBy);

        let wallet = await Wallet.findOne({ userId: user.referredBy });
        if (!wallet) {
          wallet = await Wallet.create({ userId: user.referredBy, balance: 0 });
          console.log(" Wallet created for referred user");
        }

        wallet.balance += 200;
        wallet.transactions.push({
          amount: 200,
          type: "Referral",
          transactionType: "Credit",
          transactionDetail: "Referral bonus credited",
          status: "completed",
        });
        await wallet.save();

        console.log("Referral Bonus Added Successfully!");
      }

      await Otp.deleteOne({ email });
      req.session.user = user;

      return res.render("user/otpPage", {
        email,
        success: "Signup successful! Redirecting...",
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
}

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
  res.render("user/signin", { user: req.session.user || null });
}

const postSignin = async (req, res) => {
  try {
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

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ ok: false, msg: 'Invalid credentials' });


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
      name: user.name || ''
    };

    return res.json({ ok: true, verify: true, redirect: returnUrl || req.session.returnUrl || '/' });

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

    // TODO: send verification email
    // sendVerificationEmail(user.email);

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
  passport.authenticate('google', { scope: ['profile', 'email'] })(
    req,
    res,
    next
  )
}
const googleCallBack = async (req, res, next) => {
  passport.authenticate(
    'google',
    { failureRedirect: '/' },
    async (err, user) => {
      if (err) {
        return next(err)
      }

      if (!user) {
        return res.status(401).redirect('/')
      }

      try {
        let existingUser = await userSchema.findOne({ google_id: user.id })
        let existingEmail = await userSchema.findOne({
          google_id: null,
          email: user.emails[0].value,
        })
        if (existingEmail) {
          req.logIn(existingEmail, (err) => {
            if (err) return next(err)
            res
              .status(302)
              .redirect(
                '/auth/signup?message=User already exists with this email'
              )
          })
        } else if (existingUser) {
          // User already exists, log them in
          req.logIn(existingUser, async (err) => {
            if (err) return next(err);
            req.session.isLogged = true;
            req.session.otpEmail = user.emails[0].value;
           let userDetail = await userSchema.findOne({
              email: req.session.otpEmail,
            })
            req.session.userId=userDetail._id
            res.send(`
              <script>
                  window.location.replace('/');
              </script>
          `)
          })
        } else {
          const newUser = new userSchema({
            google_id: user.id,
            firstName: user.name.givenName,
            lastName: user.name.familyName,
            email: user.emails[0].value,
            isVerified: true,
            createdAt: Date.now(),
          });

          await newUser.save()

          
            wallet = new walletSchema({
              userId: newUser._id,
              balance: 0,
              transactions: [],
            });
      
            await wallet.save(); 
          
          function generateReferralCode(length = 6) {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < length; i++) {
              code += characters.charAt(
                Math.floor(Math.random() * characters.length)
              )
            }
            return code;
          }
          const referral = new referralSchema({
            code: generateReferralCode(),
            userId: newUser._id,
          })

          await referral.save()

          req.logIn(newUser, async (err) => {
            if (err) return next(err);
            req.session.userId = newUser._id;
            req.session.isLogged = true;
            req.session.otpEmail = user.emails[0].value;
            res.send(`
              <script>
                  window.location.replace('/');
              </script>
          `)
          })
        }
      } catch (dbError) {
        console.log(dbError)
        next(new AppError('Sorry...Something went wrong', 500))
      }
    }
  )(req, res, next)
}

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

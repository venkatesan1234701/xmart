


const User = require("../../models/userSchema");
const Otp = require("../../models/otpSchema");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer")
const STATUS = require('../../utils/statusCodes');
const AppError = require('../../utils/appError')

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

const renderChangeMail = (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect("/signin")
  res.render("user/change-mail", { user })
}


const sendOtp = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(STATUS.UNAUTHORIZED).json({ success: false, message: "Login required" })

    const { newEmail } = req.body;
    if (!newEmail) return res.json({ success: false, message: "Please provide an email" })

    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) return res.json({ success: false, message: "Email already exists!" })

    const otpCode = crypto.randomInt(100000, 999999).toString()

   console.log('otp',otpCode)


    await Otp.updateOne(
      { email: newEmail },
      {
        otp: await bcrypt.hash(otpCode, 10),
        createdAt: new Date(),
        expireAt: Date.now() + 5 * 60 * 1000, 
      },
      { upsert: true }
    )

    await transporter.sendMail({
      from: `"Your App" <${process.env.EMAIL_USER}>`,
      to: newEmail,
      subject: "Your OTP for Email Change",
      text: `Your OTP is: ${otpCode}. It expires in 5 minutes.`,
    })

    req.session.otpEmail = newEmail;
    req.session.flowType = "change-email";

    res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error("Send OTP Error:", err);
    res.status(STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server Error" });
  }
}



const verifyOtp = async (req, res) => {
  try {
    const user = req.session.user;
    const email = req.session.otpEmail;

    if (!user) return res.status(STATUS.UNAUTHORIZED).json({ success: false, message: "Login required" });
    if (!email) return res.json({ success: false, message: "OTP session expired. Please resend OTP." })

    const { otp } = req.body;
    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) return res.json({ success: false, message: "OTP not found. Please resend." });
    if (Date.now() > otpRecord.expireAt) return res.json({ success: false, message: "OTP expired. Please resend." })

    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) return res.json({ success: false, message: "Invalid OTP. Try again." })

    const updatedUser = await User.findByIdAndUpdate(user.id, { email }, { new: true })

    req.session.user = {
      id: updatedUser._id.toString(),
      firstName: updatedUser.firstName,
      secondName: updatedUser.secondName || "",
      email: updatedUser.email,
      phone: updatedUser.phone || ""
    };

    await Otp.deleteOne({ email })
    delete req.session.otpEmail;
    delete req.session.flowType;

    res.json({ success: true, message: "Email updated successfully!", email: updatedUser.email })
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server Error" })
  }
}


module.exports = {
  renderChangeMail,
  sendOtp,
  verifyOtp,
};












